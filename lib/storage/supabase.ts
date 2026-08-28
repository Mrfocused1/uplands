import path from "node:path";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import type { StorageProvider } from "@/lib/storage/types";

function safeFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._ -]/g, "").trim().replace(/\s+/g, "-");
  return cleaned || "document.pdf";
}

export function canUseSupabaseStorage() {
  return isSupabaseAdminConfigured();
}

export function createSupabaseStorageProvider(bucket: () => string): StorageProvider {
  return {
    async putObject({ keyPrefix, fileName, mimeType, buffer }) {
      const safeName = safeFileName(fileName);
      const key = path.posix.join(keyPrefix, `${randomUUID()}-${safeName}`);
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.storage.from(bucket()).upload(key, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
      return { key, fileName: safeName, mimeType, size: buffer.length };
    },

    async getObject({ key }) {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase.storage.from(bucket()).download(key);
      if (error) throw new Error(`Supabase storage download failed: ${error.message}`);
      const buffer = Buffer.from(await data.arrayBuffer());

      return {
        buffer,
        fileName: path.basename(key),
        mimeType: data.type || "application/pdf",
        size: buffer.length,
      };
    },

    async deleteObjects({ keys }) {
      if (keys.length === 0) return;
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.storage.from(bucket()).remove(keys);
      if (error) throw new Error(`Supabase storage delete failed: ${error.message}`);
    },
  };
}

export const supabaseStorageProvider = createSupabaseStorageProvider(() => env("SUPABASE_RAMS_BUCKET", "rams-documents"));
export const supabaseUploadsStorageProvider = createSupabaseStorageProvider(() => env("SUPABASE_UPLOADS_BUCKET", "uplands-uploads"));
