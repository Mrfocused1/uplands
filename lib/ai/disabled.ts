import type { AiProvider, RamsAnswerInput } from "./types.ts";
import { isSummaryQuestion } from "../rams/copilotRetrieval.ts";

const SUMMARY_TOPICS = [
  { label: "risk assessments", pattern: /\brisk assessment|\brams\b/i },
  { label: "method statement controls", pattern: /\bmethod statement|\bcontrol measures\b/i },
  { label: "manual handling", pattern: /\bmanual handling\b/i },
  { label: "PPE", pattern: /\bppe\b|protective footwear|safety gloves|eye protection|dust masks?/i },
  { label: "training and competence", pattern: /\btraining\b|\bcompetence\b|\bCSCS\b|\bIPAF\b|\bPASMA\b/i },
  { label: "dust and respiratory controls", pattern: /\bdust\b|\bFFP3\b|\brespiratory\b/i },
  { label: "COSHH or hazardous substances", pattern: /\bCOSHH\b|hazardous substances?|safety data sheet|\bSDS\b/i },
  { label: "emergency arrangements", pattern: /\bemergency\b|first aid|fire evacuation|accident/i },
  { label: "environmental and waste controls", pattern: /\bwaste\b|environmental|spill/i },
  { label: "working at height or access equipment", pattern: /\bworking at height\b|\bMEWP\b|scaffold|ladder/i },
];

function evidenceTopics(input: RamsAnswerInput) {
  const evidenceText = input.evidence.map((item) => `${item.sectionTitle ?? ""} ${item.text}`).join("\n");
  return SUMMARY_TOPICS.filter((topic) => topic.pattern.test(evidenceText))
    .map((topic) => topic.label)
    .slice(0, 6);
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
      const topics = evidenceTopics(input);
      return {
        answer: [
          `AI is not configured in this environment, so I have not generated a narrative RAMS answer.`,
          `Retrieved evidence is shown below for ${input.document.contractor} - ${input.document.title}${site}${revision}.`,
          topics.length > 0 ? `Matched evidence topics include ${topics.join(", ")}.` : "Review the cited passages manually before relying on this result.",
        ].join(" "),
        citations,
        confidence: "medium",
        model: "disabled",
      };
    }

    return {
      answer:
        citations.length > 0
          ? "AI is not configured in this environment. Relevant RAMS evidence has been retrieved below for manual review; no AI conclusion has been generated."
          : "AI is not configured in this environment, and no matching RAMS evidence was found for this question.",
      citations,
      confidence: citations.length > 0 ? "medium" : "low",
      model: "disabled",
    };
  },
  async reviewRamsQuestions() {
    throw new Error("AI full RAMS review requires an AI provider.");
  },
};
