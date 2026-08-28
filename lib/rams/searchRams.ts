import { cosineSimilarity, getEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import { getChunkBoxes, listRamsChunks } from "@/lib/db/rams";
import { normaliseText, snippetFor } from "@/lib/rams/text";
import type { RamsChunkRow, RamsSearchResult } from "@/lib/rams/types";

const STOP_WORDS = new Set([
  "all",
  "and",
  "are",
  "been",
  "can",
  "for",
  "has",
  "have",
  "its",
  "only",
  "our",
  "the",
  "their",
  "they",
  "through",
  "to",
  "what",
  "where",
  "when",
  "why",
  "how",
  "does",
  "this",
  "that",
  "with",
  "from",
  "about",
  "mention",
  "mentions",
  "rams",
  "document",
  "page",
]);

function queryTerms(query: string) {
  return normaliseText(query)
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function queryPhrases(query: string) {
  const normalised = normaliseText(query);
  const phrases = normalised.match(/\b[a-z0-9][a-z0-9-]*(?:\s+[a-z0-9][a-z0-9-]*){1,4}\b/g) ?? [];
  return phrases.filter((phrase) => phrase.split(/\s+/).some((term) => !STOP_WORDS.has(term)));
}

function boxesForQuery(boxes: Awaited<ReturnType<typeof getChunkBoxes>>, query: string) {
  const terms = queryTerms(query);
  if (terms.length === 0) return boxes.slice(0, 36);
  const matches = boxes.filter((box) => terms.some((term) => normaliseText(box.text).includes(term)));
  return (matches.length > 0 ? matches : boxes).slice(0, 36);
}

function lexicalScore(chunk: RamsChunkRow, query: string) {
  const terms = queryTerms(query);
  if (terms.length === 0) return 0;
  const section = normaliseText(chunk.section_title ?? "");
  const text = chunk.normalised_text;
  const phrases = queryPhrases(query);
  let score = 0;
  let matchedTerms = 0;
  for (const term of terms) {
    const matches = text.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"))?.length ?? 0;
    if (matches > 0) matchedTerms += 1;
    score += Math.min(matches, 8) * (term.length <= 4 ? 4 : 3);
    if (section.includes(term)) score += 6;
  }
  for (const phrase of phrases) {
    if (text.includes(phrase)) score += 10 + phrase.split(/\s+/).length * 2;
    if (section.includes(phrase)) score += 12;
  }
  if (matchedTerms > 1) score *= 1 + Math.min(0.8, matchedTerms / Math.max(4, terms.length));
  if (matchedTerms === 1 && terms.length >= 5) score *= 0.35;
  return score / Math.max(1, Math.sqrt(chunk.token_count ?? 1));
}

function embeddingFrom(row: RamsChunkRow) {
  if (!row.embedding) return null;
  try {
    const parsed = JSON.parse(row.embedding);
    return Array.isArray(parsed) ? (parsed as number[]) : null;
  } catch {
    return null;
  }
}

export async function searchRams(documentId: string, query: string, limit = 8): Promise<RamsSearchResult[]> {
  const chunks = await listRamsChunks(documentId);
  const provider = getEmbeddingProvider();
  const queryEmbedding = provider ? await provider.embedText(query) : null;

  const lexicalScored = chunks
    .map((chunk) => ({ chunk, score: lexicalScore(chunk, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const rawScored = lexicalScored.length > 0 ? lexicalScored : chunks
    .map((chunk) => {
      const semantic = cosineSimilarity(queryEmbedding, embeddingFrom(chunk));
      return { chunk, score: semantic };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = rawScored[0]?.score ?? 0;
  const seenSnippets = new Set<string>();
  const scored = rawScored
    .filter((item) => item.score >= bestScore * 0.18)
    .filter((item) => {
      const signature = normaliseText(item.chunk.text).slice(0, 160);
      if (seenSnippets.has(signature)) return false;
      seenSnippets.add(signature);
      return true;
    })
    .slice(0, limit);

  const boxes = await getChunkBoxes(scored.map((item) => item.chunk.id));
  const boxesByChunk = new Map<string, typeof boxes>();
  for (const box of boxes) {
    boxesByChunk.set(box.chunk_id, [...(boxesByChunk.get(box.chunk_id) ?? []), box]);
  }

  return scored.map(({ chunk, score }) => ({
    chunkId: chunk.id,
    pageNumber: chunk.page_number,
    endPageNumber: chunk.end_page_number,
    sectionTitle: chunk.section_title ?? null,
    snippet: snippetFor(chunk.text, query),
    score: Number(score.toFixed(4)),
    text: chunk.text,
    boxes: boxesForQuery(boxesByChunk.get(chunk.id) ?? [], query),
  }));
}
