import { cosineSimilarity, getEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import { getChunkBoxes, listRamsChunks } from "@/lib/db/rams";
import { normaliseText, snippetFor } from "@/lib/rams/text";
import type { RamsChunkRow, RamsSearchResult } from "@/lib/rams/types";

const STOP_WORDS = new Set([
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

function lexicalScore(chunk: RamsChunkRow, query: string) {
  const terms = queryTerms(query);
  if (terms.length === 0) return 0;
  let score = 0;
  for (const term of terms) {
    const matches = chunk.normalised_text.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"))?.length ?? 0;
    score += matches * 3;
    if (chunk.section_title?.toLowerCase().includes(term)) score += 2;
  }
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
  const chunks = listRamsChunks(documentId);
  const provider = getEmbeddingProvider();
  const queryEmbedding = provider ? await provider.embedText(query) : null;

  const lexicalScored = chunks
    .map((chunk) => ({ chunk, score: lexicalScore(chunk, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const scored = (lexicalScored.length > 0 ? lexicalScored : chunks
    .map((chunk) => {
      const semantic = cosineSimilarity(queryEmbedding, embeddingFrom(chunk));
      return { chunk, score: semantic };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score))
    .slice(0, limit);

  const boxes = getChunkBoxes(scored.map((item) => item.chunk.id));
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
    boxes: boxesByChunk.get(chunk.id) ?? [],
  }));
}
