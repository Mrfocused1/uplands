export type RamsProcessingStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "OCR_REQUIRED";
export type RamsTextExtractionStatus = "PENDING" | "EXTRACTED" | "OCR_REQUIRED" | "FAILED";
export type RamsDecisionOrigin = "MANUAL" | "AI" | "AI_EDITED" | "SYSTEM";

export interface RamsDocumentRow {
  id: string;
  title: string;
  site_id: string | null;
  site_name: string | null;
  contractor: string;
  document_reference: string | null;
  revision: string | null;
  revision_date: string | null;
  file_name: string;
  storage_key: string;
  file_size: number;
  mime_type: string;
  page_count: number | null;
  processing_status: RamsProcessingStatus;
  processing_error: string | null;
  text_extraction_status: RamsTextExtractionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RamsSectionRow {
  id: string;
  rams_document_id: string;
  title: string;
  start_page: number;
  end_page: number;
  sort_order: number;
  created_at: string;
}

export interface RamsChunkRow {
  id: string;
  rams_document_id: string;
  section_id: string | null;
  page_number: number;
  end_page_number: number;
  chunk_index: number;
  text: string;
  normalised_text: string;
  embedding: string | null;
  token_count: number | null;
  created_at: string;
  section_title?: string | null;
}

export interface RamsChunkBoxRow {
  id: string;
  chunk_id: string;
  page_number: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page_width: number | null;
  page_height: number | null;
  sort_order: number;
}

export interface ExtractedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
}

export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
  items: ExtractedTextItem[];
}

export interface DetectedSection {
  id?: string;
  title: string;
  startPage: number;
  endPage: number;
  sortOrder: number;
}

export interface RamsChunkInput {
  id?: string;
  sectionId?: string | null;
  pageNumber: number;
  endPageNumber: number;
  chunkIndex: number;
  text: string;
  normalisedText: string;
  tokenCount: number;
  embedding?: number[] | null;
  boxes: Array<{
    pageNumber: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
    sortOrder: number;
  }>;
}

export interface RamsSearchResult {
  chunkId: string;
  pageNumber: number;
  endPageNumber: number;
  sectionTitle: string | null;
  snippet: string;
  score: number;
  text: string;
  boxes: RamsChunkBoxRow[];
}
