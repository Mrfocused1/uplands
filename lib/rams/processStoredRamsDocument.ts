import { getRamsDocument } from "@/lib/db/rams";
import { processRamsPdf } from "@/lib/rams/processRamsPdf";
import { getStorageProvider } from "@/lib/storage";
import { withStoredObjectFile } from "@/lib/storage/tempFile";

export async function processStoredRamsDocument(documentId: string) {
  const document = await getRamsDocument(documentId);
  if (!document) throw new Error("RAMS document not found.");
  if (!document.page_count) throw new Error("RAMS document page count is missing.");

  const storage = getStorageProvider();
  return withStoredObjectFile(storage, { key: document.storage_key, fileName: document.file_name }, (filePath) =>
    processRamsPdf({ documentId, filePath, pageCount: document.page_count! }),
  );
}
