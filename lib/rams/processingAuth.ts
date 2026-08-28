import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

function safeEqual(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function hasValidRamsProcessingSecret(request: Request) {
  const configuredSecret = env("RAMS_PROCESSING_SECRET");
  if (!configuredSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : request.headers.get("x-rams-processing-secret")?.trim() ?? "";
  return Boolean(token && safeEqual(token, configuredSecret));
}
