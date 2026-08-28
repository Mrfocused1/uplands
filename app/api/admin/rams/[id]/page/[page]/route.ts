import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { getStorageProvider } from "@/lib/storage";
import { withStoredObjectFile } from "@/lib/storage/tempFile";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET(_request: Request, context: { params: Promise<{ id: string; page: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id, page } = await context.params;
  const pageNumber = Number(page);
  const document = await getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || (document.page_count && pageNumber > document.page_count)) {
    return NextResponse.json({ error: "Invalid page number." }, { status: 400 });
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uplands-rams-page-"));
  const prefix = path.join(tempDir, "page");
  try {
    const storage = getStorageProvider();
    await withStoredObjectFile(storage, { key: document.storage_key, fileName: document.file_name }, async (localPath) => {
      await execFileAsync("pdftoppm", ["-png", "-r", "150", "-f", String(pageNumber), "-l", String(pageNumber), "-singlefile", localPath, prefix], {
        maxBuffer: 5 * 1024 * 1024,
      });
    });
    const png = await fs.readFile(`${prefix}.png`);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render this PDF page.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
