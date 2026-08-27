import type { AiConfidence, RamsStructuredAnswer } from "@/lib/ai/types";

export function validateRamsStructuredAnswer(input: unknown, allowedCitationIds: Set<string>, model: string): RamsStructuredAnswer {
  if (!input || typeof input !== "object") throw new Error("AI provider returned an invalid response.");
  const value = input as { answer?: unknown; citations?: unknown; confidence?: unknown };
  const answer = typeof value.answer === "string" ? value.answer.trim() : "";
  const citations = Array.isArray(value.citations)
    ? value.citations.filter((item): item is string => typeof item === "string" && allowedCitationIds.has(item))
    : [];
  const confidence: AiConfidence =
    value.confidence === "high" || value.confidence === "medium" || value.confidence === "low" ? value.confidence : "low";

  if (!answer) throw new Error("AI provider returned an empty answer.");
  return { answer, citations, confidence, model };
}
