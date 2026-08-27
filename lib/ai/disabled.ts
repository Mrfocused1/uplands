import type { AiProvider, RamsAnswerInput } from "@/lib/ai/types";

export const disabledAiProvider: AiProvider = {
  name: "disabled",
  isConfigured() {
    return false;
  },
  async answerRamsQuestion(input: RamsAnswerInput) {
    const citations = input.evidence.slice(0, 3).map((item) => item.chunkId);
    return {
      answer:
        citations.length > 0
          ? "AI is not configured in this environment. Relevant RAMS evidence has been retrieved below for manual review."
          : "AI is not configured in this environment, and no matching RAMS evidence was found for this question.",
      citations,
      confidence: citations.length > 0 ? "medium" : "low",
      model: "disabled",
    };
  },
};
