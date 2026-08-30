import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { createRamsDocument, getRamsDocument, listRamsDocuments, type RamsDocumentWithCounts } from "@/lib/db/rams";
import { dispatchRamsProcessing, getRamsProcessingMode } from "@/lib/rams/dispatchRamsProcessing";
import { processStoredRamsDocument } from "@/lib/rams/processStoredRamsDocument";
import { validatePdfBuffer } from "@/lib/rams/processRamsPdf";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 80 * 1024 * 1024;

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function serializeDocument(row: RamsDocumentWithCounts | Awaited<ReturnType<typeof getRamsDocument>>) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    siteId: row.site_id,
    siteName: row.site_name,
    contractor: row.contractor,
    documentReference: row.document_reference,
    revision: row.revision,
    revisionDate: row.revision_date,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    pageCount: row.page_count,
    processingStatus: row.processing_status,
    processingError: row.processing_error,
    textExtractionStatus: row.text_extraction_status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sectionCount: "section_count" in row ? row.section_count : 0,
    chunkCount: "chunk_count" in row ? row.chunk_count : 0,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const siteId = new URL(request.url).searchParams.get("siteId");
  const documents = await listRamsDocuments({ siteId });
  return NextResponse.json({ documents: documents.map(serializeDocument).filter(Boolean) });
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PDF_SIZE + 1024 * 1024) {
    return NextResponse.json({ error: "Upload request is too large. Maximum PDF size is 80MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a RAMS PDF to upload." }, { status: 400 });

  const title = value(formData, "title");
  const contractor = value(formData, "contractor");
  if (!title) return NextResponse.json({ error: "RAMS title is required." }, { status: 400 });
  if (!contractor) return NextResponse.json({ error: "Contractor/subcontractor is required." }, { status: 400 });
  if (file.size <= 0) return NextResponse.json({ error: "The uploaded PDF is empty." }, { status: 400 });
  if (file.size > MAX_PDF_SIZE) return NextResponse.json({ error: "PDF is too large. Maximum size is 80MB." }, { status: 400 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let pageCount = 0;
  try {
    pageCount = (await validatePdfBuffer(buffer)).pageCount;
  } catch {
    return NextResponse.json({ error: "The uploaded file is not a readable PDF." }, { status: 400 });
  }

  const storage = getStorageProvider();
  const stored = await storage.putObject({
    keyPrefix: "uploads",
    fileName: file.name,
    mimeType: "application/pdf",
    buffer,
  });

  const documentId = await createRamsDocument({
    title,
    siteId: value(formData, "siteId") || null,
    siteName: value(formData, "siteName") || null,
    contractor,
    documentReference: value(formData, "documentReference") || null,
    revision: value(formData, "revision") || null,
    revisionDate: value(formData, "revisionDate") || null,
    fileName: stored.fileName,
    storageKey: stored.key,
    fileSize: stored.size,
    mimeType: stored.mimeType,
    pageCount,
    createdBy: admin.displayName,
  });

  if (getRamsProcessingMode() !== "inline") {
    const dispatch = await dispatchRamsProcessing(documentId);
    const row = await getRamsDocument(documentId);
    return NextResponse.json(
      {
        document: serializeDocument(row),
        processing: {
          status: row?.processing_status ?? "UPLOADED",
          pageCount,
          sectionCount: 0,
          chunkCount: 0,
          mode: dispatch.mode,
          dispatched: dispatch.dispatched,
          message: dispatch.message,
        },
      },
      { status: 202 },
    );
  }

  try {
    const processing = await processStoredRamsDocument(documentId);
    const row = await getRamsDocument(documentId);
    return NextResponse.json({ document: serializeDocument(row), processing }, { status: 201 });
  } catch (error) {
    const row = await getRamsDocument(documentId);
    return NextResponse.json(
      {
        document: serializeDocument(row),
        error: error instanceof Error ? error.message : "RAMS processing failed.",
      },
      { status: 202 },
    );
  }
}
