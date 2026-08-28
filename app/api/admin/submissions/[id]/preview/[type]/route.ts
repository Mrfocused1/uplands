import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getSubmission, loadEvidenceDocument } from "@/lib/db/submissions";

export const runtime = "nodejs";

/**
 * Serve a browser-displayable image of a stored document. Raster images are
 * returned as-is; PDFs are rasterised to page 1 at a modest DPI for editing.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string; type: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id, type } = await context.params;
  const result = await getSubmission(id);
  if (!result) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const document = result.evidence.find((doc) => doc.document_type === type && doc.storage_path);
  if (!document?.storage_path) return NextResponse.json({ error: "No document uploaded." }, { status: 404 });

  const original = await loadEvidenceDocument(document);
  const mime = original.mimeType;

  if (mime === "application/pdf") {
    const png = await sharp(original.buffer, { density: 150 }).png().toBuffer();
    return new NextResponse(png, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }

  // HEIC/HEIF are not universally decodable in <img>; rasterise via sharp so the
  // browser always has a displayable preview (aspect ratio is preserved).
  if (mime === "image/heic" || mime === "image/heif") {
    const jpeg = await sharp(original.buffer).rotate().jpeg({ quality: 90 }).toBuffer();
    return new NextResponse(jpeg, {
      status: 200,
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(new Uint8Array(original.buffer), {
    status: 200,
    headers: { "Content-Type": mime, "Cache-Control": "no-store" },
  });
}
