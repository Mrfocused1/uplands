import type { RamsSearchResult } from "@/lib/rams/types";

export type AiConfidence = "low" | "medium" | "high";

export interface RamsAnswerInput {
  question: string;
  document: {
    id: string;
    title: string;
    contractor: string;
    siteName: string | null;
    revision: string | null;
  };
  reviewContext?: {
    questionKey?: string;
    answer?: string;
    comment?: string;
    decisionOrigin?: string;
  };
  evidence: RamsSearchResult[];
}

export interface RamsStructuredAnswer {
  answer: string;
  citations: string[];
  confidence: AiConfidence;
  model: string;
}

export interface AiProvider {
  name: string;
  isConfigured(): boolean;
  answerRamsQuestion(input: RamsAnswerInput): Promise<RamsStructuredAnswer>;
}
