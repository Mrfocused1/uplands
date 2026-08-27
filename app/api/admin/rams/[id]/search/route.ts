import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { searchRams } from "@/lib/rams/searchRams";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const document = getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { query?: string; limit?: number } | null;
  const query = body?.query?.trim() ?? "";
  if (!query) return NextResponse.json({ error: "Search query is required." }, { status: 400 });
  if (document.processing_status !== "READY") {
    return NextResponse.json({ results: [], status: document.processing_status, error: document.processing_error });
  }

  const results = await searchRams(id, query, Math.min(Math.max(body?.limit ?? 8, 1), 12));
  return NextResponse.json({ results });
}
