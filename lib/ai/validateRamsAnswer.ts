import type { AiConfidence, RamsStructuredAnswer } from "@/lib/ai/types";
import type { RamsReviewAnswer } from "@/lib/rams/reviewQuestions";

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

export function validateRamsReviewRecommendations(input: unknown, allowedCitationIdsByQuestion: Map<string, Set<string>>) {
  if (!input || typeof input !== "object") throw new Error("AI provider returned an invalid review response.");
  const value = input as { recommendations?: unknown };
  if (!Array.isArray(value.recommendations)) throw new Error("AI provider returned no review recommendations.");

  return value.recommendations.map((item) => {
    if (!item || typeof item !== "object") throw new Error("AI provider returned an invalid review recommendation.");
    const recommendation = item as {
      questionKey?: unknown;
      recommendation?: unknown;
      comment?: unknown;
      citations?: unknown;
      confidence?: unknown;
    };
    const questionKey = typeof recommendation.questionKey === "string" ? recommendation.questionKey : "";
    const allowedCitationIds = allowedCitationIdsByQuestion.get(questionKey) ?? new Set<string>();
    const answer: RamsReviewAnswer =
      recommendation.recommendation === "Yes" || recommendation.recommendation === "No" || recommendation.recommendation === "N/A"
        ? recommendation.recommendation
        : "N/A";
    const comment = typeof recommendation.comment === "string" ? recommendation.comment.trim() : "";
    const citations = Array.isArray(recommendation.citations)
      ? recommendation.citations.filter((citation): citation is string => typeof citation === "string" && allowedCitationIds.has(citation))
      : [];
    const confidence: "low" | "medium" | "high" =
      recommendation.confidence === "high" || recommendation.confidence === "medium" || recommendation.confidence === "low"
        ? recommendation.confidence
        : "low";

    if (!questionKey || !comment) throw new Error("AI provider returned an incomplete review recommendation.");
    return {
      questionKey,
      recommendation: answer,
      comment,
      citations,
      confidence,
      status: "needs_human_confirmation" as const,
    };
  });
}
