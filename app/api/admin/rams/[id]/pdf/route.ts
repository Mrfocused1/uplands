import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const document = await getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  const storage = getStorageProvider();
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const fileName = document.file_name.replace(/"/g, "");

  if (storage.getSignedUrl) {
    const signedUrl = await storage.getSignedUrl({
      key: document.storage_key,
      downloadFileName: disposition === "attachment" ? fileName : false,
    });
    return NextResponse.redirect(signedUrl, { status: 307 });
  }

  const object = await storage.getObject({ key: document.storage_key });

  return new NextResponse(new Uint8Array(object.buffer), {
    status: 200,
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
