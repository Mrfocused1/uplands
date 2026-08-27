import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";

const DIMENSIONS = 192;

function hashTerm(term: string) {
  let hash = 2166136261;
  for (let index = 0; index < term.length; index += 1) {
    hash ^= term.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function termsFrom(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2);
}

export const localEmbeddingProvider: EmbeddingProvider = {
  name: "local",
  async embedText(text) {
    const vector = Array.from({ length: DIMENSIONS }, () => 0);
    for (const term of termsFrom(text)) {
      const hash = hashTerm(term);
      const index = hash % DIMENSIONS;
      vector[index] += hash & 1 ? 1 : -1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (magnitude === 0) return null;
    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  },
};
