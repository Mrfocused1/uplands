import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RAMS_STORAGE_DIR } from "@/lib/db";
import type { StorageProvider } from "@/lib/storage/types";

function safeFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._ -]/g, "").trim().replace(/\s+/g, "-");
  return cleaned || "document.pdf";
}

function pathForKey(key: string) {
  const normalised = path.normalize(key);
  if (normalised.startsWith("..") || path.isAbsolute(normalised)) {
    throw new Error("Invalid storage key.");
  }
  return path.join(RAMS_STORAGE_DIR, normalised);
}

export const localStorageProvider: StorageProvider = {
  async putObject({ keyPrefix, fileName, mimeType, buffer }) {
    const safeName = safeFileName(fileName);
    const key = path.posix.join(keyPrefix, `${randomUUID()}-${safeName}`);
    const target = pathForKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { key, fileName: safeName, mimeType, size: buffer.length };
  },

  async getObject({ key }) {
    const target = pathForKey(key);
    const buffer = await fs.readFile(target);
    return {
      buffer,
      fileName: path.basename(target),
      mimeType: "application/pdf",
      size: buffer.length,
    };
  },

  getLocalPath({ key }) {
    return pathForKey(key);
  },
};
