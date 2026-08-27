import { localEmbeddingProvider } from "@/lib/ai/embeddings/local";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";

export function getEmbeddingProvider(): EmbeddingProvider | null {
  const provider = process.env.EMBEDDING_PROVIDER ?? "local";
  if (provider === "local") return localEmbeddingProvider;
  if (provider === "none" || provider === "disabled") return null;
  return localEmbeddingProvider;
}

export function cosineSimilarity(left: number[] | null, right: number[] | null) {
  if (!left || !right || left.length !== right.length) return 0;
  let score = 0;
  for (let index = 0; index < left.length; index += 1) {
    score += left[index] * right[index];
  }
  return score;
}
