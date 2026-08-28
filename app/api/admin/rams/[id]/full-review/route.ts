import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai/provider";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getRamsDocument } from "@/lib/db/rams";
import { ramsReviewQuestions } from "@/lib/rams/reviewQuestions";
import { searchRams } from "@/lib/rams/searchRams";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const limited = await rateLimit(request, { scope: "rams-full-review", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const { id } = await context.params;
  const document = await getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });
  if (document.processing_status !== "READY") {
    return NextResponse.json({ error: document.processing_error ?? "This RAMS is not ready for AI review.", status: document.processing_status }, { status: 409 });
  }

  const provider = getAiProvider();
  if (!provider.isConfigured() || !provider.reviewRamsQuestions) {
    return NextResponse.json({ error: "AI full RAMS review requires a configured AI provider." }, { status: 409 });
  }

  const questions = await Promise.all(
    ramsReviewQuestions.map(async (question) => ({
      key: question.key,
      question: question.text,
      evidence: await searchRams(id, `${question.text} ${question.searchPrompt}`, 5),
    })),
  );

  const review = await provider.reviewRamsQuestions({
    document: {
      id: document.id,
      title: document.title,
      contractor: document.contractor,
      siteName: document.site_name,
      revision: document.revision,
    },
    questions,
  });

  const evidenceByQuestion = new Map(questions.map((question) => [question.key, question.evidence]));
  return NextResponse.json({
    model: review.model,
    recommendations: review.recommendations.map((recommendation) => {
      const evidence = evidenceByQuestion.get(recommendation.questionKey) ?? [];
      const citationSet = new Set(recommendation.citations);
      return {
        ...recommendation,
        citations: evidence.filter((item) => citationSet.has(item.chunkId)),
      };
    }),
  });
}
