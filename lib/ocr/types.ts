export interface OcrProvider {
  name: string;
  isAvailable(): boolean;
  extractText(): Promise<never>;
}
