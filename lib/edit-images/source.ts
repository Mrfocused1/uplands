import path from "node:path";

import { findEditableImageDocument } from "@/config/editImages";

const waitroseBalhamBase = path.join(process.cwd(), "private", "edit-images", "waitrose-balham");

export function getEditableImageSourcePath(slug: string) {
  const document = findEditableImageDocument(slug);
  if (!document) return null;
  return path.join(waitroseBalhamBase, "source.pdf");
}
