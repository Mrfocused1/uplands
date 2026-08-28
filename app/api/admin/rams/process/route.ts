import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { captureException } from "@/lib/observability";
import { hasValidRamsProcessingSecret } from "@/lib/rams/processingAuth";
import { processStoredRamsDocument } from "@/lib/rams/processStoredRamsDocument";

export const runtime = "nodejs";

async function authorize(request: Request) {
  if (hasValidRamsProcessingSecret(request)) return true;

  try {
    await requireAdmin();
    return true;
  } catch (error) {
    if (error instanceof UnauthorizedError) return false;
    throw error;
  }
}

export async function POST(request: Request) {
  if (!(await authorize(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let documentId = "";
  try {
    const body = (await request.json()) as { documentId?: unknown };
    documentId = typeof body.documentId === "string" ? body.documentId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Provide a JSON body with documentId." }, { status: 400 });
  }

  if (!documentId) return NextResponse.json({ error: "documentId is required." }, { status: 400 });

  const document = await getRamsDocument(documentId);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  try {
    const processing = await processStoredRamsDocument(documentId);
    return NextResponse.json({ document: await getRamsDocument(documentId), processing });
  } catch (error) {
    captureException(error, { tags: { area: "rams-processing" }, extra: { documentId } });
    return NextResponse.json(
      {
        document: await getRamsDocument(documentId),
        error: error instanceof Error ? error.message : "RAMS processing failed.",
      },
      { status: 202 },
    );
  }
}
