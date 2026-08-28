import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument, listRamsSections } from "@/lib/db/rams";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const document = await getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  const sections = await listRamsSections(id);
  return NextResponse.json({
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      startPage: section.start_page,
      endPage: section.end_page,
      sortOrder: section.sort_order,
    })),
  });
}
