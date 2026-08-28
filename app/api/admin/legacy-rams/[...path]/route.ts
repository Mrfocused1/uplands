import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";

export const runtime = "nodejs";

const LEGACY_ROOT = path.join(process.cwd(), "private", "rams");

const MIME_BY_EXT: Record<string, string> = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function safeLegacyPath(parts: string[]) {
  const relative = parts.join("/");
  const normalised = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(LEGACY_ROOT, normalised);
  if (!filePath.startsWith(LEGACY_ROOT + path.sep)) return null;
  return filePath;
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { path: parts } = await context.params;
  const filePath = safeLegacyPath(parts ?? []);
  if (!filePath) return NextResponse.json({ error: "Invalid legacy RAMS path." }, { status: 400 });

  let file: Buffer;
  try {
    file = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Legacy RAMS asset not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const fileName = path.basename(filePath).replace(/"/g, "");
  const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
