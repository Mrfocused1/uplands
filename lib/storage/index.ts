import { localStorageProvider } from "@/lib/storage/local";
import { canUseSupabaseStorage, supabaseStorageProvider, supabaseUploadsStorageProvider } from "@/lib/storage/supabase";
import type { StorageProvider } from "@/lib/storage/types";

export function getStorageProvider(): StorageProvider {
  if (process.env.RAMS_STORAGE_PROVIDER === "supabase") {
    if (!canUseSupabaseStorage()) {
      throw new Error("RAMS_STORAGE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
    }
    return supabaseStorageProvider;
  }

  return localStorageProvider;
}

export function getSubmissionStorageProvider(): StorageProvider {
  if (process.env.SUBMISSIONS_STORAGE_PROVIDER === "supabase") {
    if (!canUseSupabaseStorage()) {
      throw new Error("SUBMISSIONS_STORAGE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
    }
    return supabaseUploadsStorageProvider;
  }

  return localStorageProvider;
}
