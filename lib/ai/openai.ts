import type { AiProvider, RamsAnswerInput, RamsFullReviewInput, RamsStructuredAnswer } from "@/lib/ai/types";
import { validateRamsReviewRecommendations, validateRamsStructuredAnswer } from "@/lib/ai/validateRamsAnswer";

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

function fullReviewSystemPrompt() {
  return [
    "You are the Uplands RAMS Assistant.",
    "Review each supplied UHSF16.01 RAMS question using ONLY the evidence supplied for that question.",
    "Do not use outside knowledge to claim what the RAMS contains.",
    "If evidence is missing or unclear, recommend N/A or No as appropriate and explain that the supplied evidence does not support a positive answer.",
    "Never invent page numbers, section names, quotations or citation IDs.",
    "Citations must reference only evidence IDs supplied for the same question.",
    "Keep comments concise and suitable for a construction/site-management RAMS review.",
    "Return only valid JSON with key recommendations.",
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

function fullReviewPayload(input: RamsFullReviewInput) {
  return {
    rams: input.document,
    questions: input.questions.map((question) => ({
      questionKey: question.key,
      question: question.question,
      evidence: question.evidence.map((item) => ({
        id: item.chunkId,
        page: item.pageNumber,
        section: item.sectionTitle,
        text: item.text.slice(0, 1600),
      })),
    })),
    outputShape: {
      recommendations: [
        {
          questionKey: "q6",
          recommendation: "Yes | No | N/A",
          comment: "Short evidence-led review comment.",
          citations: ["chunk-id-from-supplied-evidence"],
          confidence: "low | medium | high",
        },
      ],
    },
  };
}

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseStructuredAnswer(text: string, allowedCitationIds: Set<string>, model: string): RamsStructuredAnswer {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonText(text));
  } catch {
    throw new Error("AI provider returned invalid JSON.");
  }

  return validateRamsStructuredAnswer(parsed, allowedCitationIds, model);
}

function responseText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return data.output_text ?? data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ?? "";
}

async function createResponse(input: { model: string; system: string; payload: unknown; maxOutputTokens?: number }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        { role: "system", content: input.system },
        { role: "user", content: JSON.stringify(input.payload) },
      ],
      ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
    }),
  });

  if (!response.ok) throw new Error("AI provider request failed.");
  return (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
}

export const openAiProvider: AiProvider = {
  name: "openai",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async answerRamsQuestion(input: RamsAnswerInput) {
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const data = await createResponse({ model, system: systemPrompt(), payload: userPayload(input), maxOutputTokens: 900 });
    const text = responseText(data);
    return parseStructuredAnswer(text, new Set(input.evidence.map((item) => item.chunkId)), model);
  },
  async reviewRamsQuestions(input: RamsFullReviewInput) {
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const data = await createResponse({ model, system: fullReviewSystemPrompt(), payload: fullReviewPayload(input), maxOutputTokens: 3200 });
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJsonText(responseText(data)));
    } catch {
      throw new Error("AI provider returned invalid review JSON.");
    }
    const allowedCitationIdsByQuestion = new Map(input.questions.map((question) => [question.key, new Set(question.evidence.map((item) => item.chunkId))]));
    return {
      recommendations: validateRamsReviewRecommendations(parsed, allowedCitationIdsByQuestion),
      model,
    };
  },
};
