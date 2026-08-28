const SUMMARY_QUERY =
  "RAMS method statement scope of works risk assessment significant hazards controls PPE training emergency arrangements environmental controls supervision responsibilities";

const SUMMARY_PATTERNS = [/\bsummary\b/i, /\bsummarise\b/i, /\bsummarize\b/i, /\boverview\b/i, /\btell me about\b/i, /\bwhat is this rams about\b/i];

export function isSummaryQuestion(question: string) {
  return SUMMARY_PATTERNS.some((pattern) => pattern.test(question));
}

export function ramsCopilotRetrievalQuery({
  question,
  reviewComment,
  reviewQuestion,
}: {
  question: string;
  reviewComment?: string | null;
  reviewQuestion?: string | null;
}) {
  const trimmedQuestion = question.trim();
  const context = [reviewQuestion, reviewComment].filter(Boolean).join(" ").trim();
  if (context) return `${trimmedQuestion} ${context}`.trim();
  if (isSummaryQuestion(trimmedQuestion)) return SUMMARY_QUERY;
  return trimmedQuestion;
}
