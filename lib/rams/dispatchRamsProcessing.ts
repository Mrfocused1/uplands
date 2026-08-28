import { env } from "@/lib/env";
import { updateRamsProcessingStatus } from "@/lib/db/rams";
import { captureException } from "@/lib/observability";

export type RamsProcessingMode = "inline" | "webhook" | "manual";

export function getRamsProcessingMode(): RamsProcessingMode {
  const configured = env("RAMS_PROCESSING_MODE");
  if (configured === "inline" || configured === "webhook" || configured === "manual") return configured;
  return process.env.NODE_ENV === "production" ? "manual" : "inline";
}

export async function dispatchRamsProcessing(documentId: string) {
  const mode = getRamsProcessingMode();
  if (mode !== "webhook") {
    return {
      mode,
      dispatched: false,
      message: mode === "manual" ? "RAMS uploaded. Processing must be started by an admin or worker." : "Inline processing is enabled.",
    };
  }

  const url = env("RAMS_PROCESSING_WEBHOOK_URL");
  if (!url) {
    return {
      mode,
      dispatched: false,
      message: "RAMS_PROCESSING_MODE is webhook, but RAMS_PROCESSING_WEBHOOK_URL is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    await updateRamsProcessingStatus(documentId, "PROCESSING", { error: null });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env("RAMS_PROCESSING_SECRET") ? { Authorization: `Bearer ${env("RAMS_PROCESSING_SECRET")}` } : {}),
      },
      body: JSON.stringify({ documentId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAMS processing webhook returned ${response.status}.`);
    }

    return { mode, dispatched: true, message: "RAMS processing was dispatched to the configured worker." };
  } catch (error) {
    captureException(error, { tags: { area: "rams-processing", mode: "webhook" }, extra: { documentId } });
    await updateRamsProcessingStatus(documentId, "UPLOADED", {
      error: error instanceof Error ? error.message : "RAMS processing webhook dispatch failed.",
    });
    return {
      mode,
      dispatched: false,
      message: error instanceof Error ? error.message : "RAMS processing webhook dispatch failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
