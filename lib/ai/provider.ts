import { disabledAiProvider } from "@/lib/ai/disabled";
import { openAiProvider } from "@/lib/ai/openai";
import type { AiProvider } from "@/lib/ai/types";

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "disabled";
  if (provider === "openai") return openAiProvider;
  return disabledAiProvider;
}
