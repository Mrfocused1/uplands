import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { captureException } from "@/lib/observability";
import { hasValidRamsProcessingSecret } from "@/lib/rams/processingAuth";
import { processStoredRamsDocument } from "@/lib/rams/processStoredRamsDocument";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidRamsProcessingSecret(request)) {
    try {
      await requireAdmin();
    } catch (error) {
      if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      throw error;
    }
  }

  const { id } = await context.params;
  const document = await getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  try {
    const processing = await processStoredRamsDocument(id);
    return NextResponse.json({ document: await getRamsDocument(id), processing });
  } catch (error) {
    captureException(error, { tags: { area: "rams-processing" }, extra: { documentId: id } });
    return NextResponse.json(
      {
        document: await getRamsDocument(id),
        error: error instanceof Error ? error.message : "RAMS processing failed.",
      },
      { status: 202 },
    );
  }
}
