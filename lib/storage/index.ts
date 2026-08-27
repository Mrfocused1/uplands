import { localStorageProvider } from "@/lib/storage/local";
import type { StorageProvider } from "@/lib/storage/types";

export function getStorageProvider(): StorageProvider {
  return localStorageProvider;
}
