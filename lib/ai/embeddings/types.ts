export interface EmbeddingProvider {
  name: string;
  embedText(text: string): Promise<number[] | null>;
}
