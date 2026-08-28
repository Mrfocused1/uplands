import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { StorageProvider } from "@/lib/storage/types";

export async function withStoredObjectFile<T>(
  storage: StorageProvider,
  input: { key: string; fileName?: string },
  handler: (filePath: string) => Promise<T>,
) {
  const localPath = storage.getLocalPath?.({ key: input.key });
  if (localPath) return handler(localPath);

  const object = await storage.getObject({ key: input.key });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uplands-rams-object-"));
  const fileName = (input.fileName || object.fileName || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = path.join(/* turbopackIgnore: true */ tempDir, fileName || "document.pdf");

  try {
    await fs.writeFile(filePath, object.buffer);
    return await handler(filePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
