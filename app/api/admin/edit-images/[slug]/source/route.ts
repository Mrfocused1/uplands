import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { findEditableImageDocument } from "@/config/editImages";
import { getEditableImageSourcePath } from "@/lib/edit-images/source";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const document = findEditableImageDocument(slug);
  const sourcePath = getEditableImageSourcePath(slug);
  if (!document || !sourcePath) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const buffer = await fs.readFile(sourcePath);
  const fileName = `${path.basename(document.title).replace(/"/g, "")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
