import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai/provider";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { addRamsChatCitations, addRamsChatMessage, createRamsChatThread, getRamsDocument } from "@/lib/db/rams";
import { searchRams } from "@/lib/rams/searchRams";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const document = getRamsDocument(id);
  if (!document) return NextResponse.json({ error: "RAMS document not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { question?: string; reviewQuestionKey?: string; reviewAnswer?: string; reviewComment?: string } | null;
  const question = body?.question?.trim() ?? "";
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });
  if (document.processing_status !== "READY") {
    return NextResponse.json({ error: document.processing_error ?? "This RAMS is not ready for questions.", status: document.processing_status }, { status: 409 });
  }

  const evidence = await searchRams(id, question, 8);
  const provider = getAiProvider();
  const answer = await provider.answerRamsQuestion({
    question,
    document: {
      id: document.id,
      title: document.title,
      contractor: document.contractor,
      siteName: document.site_name,
      revision: document.revision,
    },
    reviewContext: {
      questionKey: body?.reviewQuestionKey,
      answer: body?.reviewAnswer,
      comment: body?.reviewComment,
      decisionOrigin: "MANUAL",
    },
    evidence,
  });

  const allowed = new Set(evidence.map((item) => item.chunkId));
  const citations = answer.citations.filter((citation) => allowed.has(citation));
  const citedEvidence = evidence.filter((item) => citations.includes(item.chunkId));
  const threadId = createRamsChatThread(id, question.slice(0, 80), String(admin.id));
  addRamsChatMessage({ threadId, role: "user", message: question });
  const messageId = addRamsChatMessage({ threadId, role: "assistant", message: answer.answer, model: answer.model });
  addRamsChatCitations(messageId, citations);

  return NextResponse.json({
    answer: answer.answer,
    confidence: answer.confidence,
    model: answer.model,
    aiConfigured: provider.isConfigured(),
    citations: citedEvidence,
  });
}
