import type { AiProvider, RamsAnswerInput, RamsStructuredAnswer } from "@/lib/ai/types";
import { validateRamsStructuredAnswer } from "@/lib/ai/validateRamsAnswer";

function systemPrompt() {
  return [
    "You are the Uplands RAMS Assistant.",
    "Answer questions using ONLY the supplied RAMS evidence.",
    "Do not use outside knowledge to claim what the RAMS contains.",
    "If the evidence does not support the answer, say so.",
    "Never invent page numbers, section names or quotations.",
    "Citations must reference only the supplied evidence IDs.",
    "Do not claim that an item was present unless the supplied evidence supports it.",
    "Keep answers concise, professional and suitable for a construction/site-management environment.",
    "Return only valid JSON with keys: answer, citations, confidence.",
  ].join("\n");
}

function userPayload(input: RamsAnswerInput) {
  return {
    question: input.question,
    rams: input.document,
    reviewContext: input.reviewContext ?? null,
    evidence: input.evidence.map((item) => ({
      id: item.chunkId,
      page: item.pageNumber,
      section: item.sectionTitle,
      text: item.text.slice(0, 2400),
    })),
  };
}

function parseStructuredAnswer(text: string, allowedCitationIds: Set<string>, model: string): RamsStructuredAnswer {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI provider returned invalid JSON.");
  }

  return validateRamsStructuredAnswer(parsed, allowedCitationIds, model);
}

export const openAiProvider: AiProvider = {
  name: "openai",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async answerRamsQuestion(input: RamsAnswerInput) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: JSON.stringify(userPayload(input)) },
        ],
      }),
    });

    if (!response.ok) throw new Error("AI provider request failed.");
    const data = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ?? "";
    return parseStructuredAnswer(text, new Set(input.evidence.map((item) => item.chunkId)), model);
  },
};
