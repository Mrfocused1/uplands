import type { RamsSearchResult } from "@/lib/rams/types";
import type { RamsReviewAnswer } from "@/lib/rams/reviewQuestions";

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

export interface RamsFullReviewQuestionInput {
  key: string;
  question: string;
  evidence: RamsSearchResult[];
}

export interface RamsReviewRecommendation {
  questionKey: string;
  recommendation: RamsReviewAnswer;
  comment: string;
  citations: string[];
  confidence: AiConfidence;
  status: "needs_human_confirmation";
}

export interface RamsFullReviewInput {
  document: RamsAnswerInput["document"];
  questions: RamsFullReviewQuestionInput[];
}

export interface RamsFullReviewOutput {
  recommendations: RamsReviewRecommendation[];
  model: string;
}

export interface AiProvider {
  name: string;
  isConfigured(): boolean;
  answerRamsQuestion(input: RamsAnswerInput): Promise<RamsStructuredAnswer>;
  reviewRamsQuestions?(input: RamsFullReviewInput): Promise<RamsFullReviewOutput>;
}
