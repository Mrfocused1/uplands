import type { AiProvider, RamsAnswerInput } from "./types.ts";
import { isSummaryQuestion } from "../rams/copilotRetrieval.ts";

function uniqueSections(input: RamsAnswerInput) {
  const sections = input.evidence.map((item) => item.sectionTitle).filter(Boolean);
  return [...new Set(sections)].slice(0, 5);
}

export const disabledAiProvider: AiProvider = {
  name: "disabled",
  isConfigured() {
    return false;
  },
  async answerRamsQuestion(input: RamsAnswerInput) {
    const citations = input.evidence.slice(0, 3).map((item) => item.chunkId);
    if (isSummaryQuestion(input.question) && citations.length > 0) {
      const site = input.document.siteName ? ` at ${input.document.siteName}` : "";
      const revision = input.document.revision ? `, revision ${input.document.revision}` : "";
      const sections = uniqueSections(input);
      return {
        answer: [
          `${input.document.contractor} RAMS covers ${input.document.title}${site}${revision}.`,
          sections.length > 0 ? `The retrieved RAMS evidence is mainly from: ${sections.join(", ")}.` : "Relevant RAMS evidence has been retrieved below.",
          "AI is not configured in this environment, so this is a document-intelligence summary with source citations for manual review.",
        ].join(" "),
        citations,
        confidence: "medium",
        model: "disabled",
      };
    }

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
