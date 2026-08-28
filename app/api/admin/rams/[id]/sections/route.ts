import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument, listRamsSections } from "@/lib/db/rams";

export const runtime = "nodejs";

function looksLikeNoisySection(title: string) {
  const words = title.trim().split(/\s+/);
  return (
    words.length > 14 ||
    /\bactivity\b.*\bpersons? at risk\b/i.test(title) ||
    /\bassessor\b.*\bassessment no\b/i.test(title) ||
    /\bdistribution of\b.*\bemployees\b/i.test(title) ||
    /\bfloor area\b.*\bmanual handling\b/i.test(title)
  );
}

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
  const seen = new Set<string>();
  const cleanSections = sections
    .map((section) => {
      const startPage = Math.max(1, section.start_page);
      const endPage = Math.max(startPage, section.end_page);
      return {
        id: section.id,
        title: section.title,
        startPage,
        endPage,
        sortOrder: section.sort_order,
      };
    })
    .filter((section) => {
      const key = `${section.startPage}:${section.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
      if (seen.has(key) || looksLikeNoisySection(section.title)) return false;
      seen.add(key);
      return true;
    });

  return NextResponse.json({
    sections: cleanSections,
  });
}
