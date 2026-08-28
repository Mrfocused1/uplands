export interface StoredObject {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  putObject(input: { keyPrefix: string; fileName: string; mimeType: string; buffer: Buffer }): Promise<StoredObject>;
  getObject(input: { key: string }): Promise<{ buffer: Buffer; fileName: string; mimeType: string; size: number }>;
  getSignedUrl?(input: { key: string; expiresInSeconds?: number; downloadFileName?: string | false }): Promise<string>;
  deleteObjects?(input: { keys: string[] }): Promise<void>;
  getLocalPath?(input: { key: string }): string;
}
