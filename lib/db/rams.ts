import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  RamsChunkBoxRow,
  RamsChunkInput,
  RamsChunkRow,
  RamsDecisionOrigin,
  RamsDocumentRow,
  RamsProcessingStatus,
  RamsSectionRow,
  RamsTextExtractionStatus,
} from "@/lib/rams/types";

export interface CreateRamsDocumentInput {
  title: string;
  siteName?: string | null;
  contractor: string;
  documentReference?: string | null;
  revision?: string | null;
  revisionDate?: string | null;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number | null;
  createdBy?: string | null;
}

export function createRamsDocument(input: CreateRamsDocumentInput) {
  const id = randomUUID();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO rams_documents
       (id, title, site_name, contractor, document_reference, revision, revision_date, file_name, storage_key,
        file_size, mime_type, page_count, processing_status, text_extraction_status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED', 'PENDING', ?, ?, ?)`,
    )
    .run(
      id,
      input.title,
      input.siteName ?? null,
      input.contractor,
      input.documentReference ?? null,
      input.revision ?? null,
      input.revisionDate ?? null,
      input.fileName,
      input.storageKey,
      input.fileSize,
      input.mimeType,
      input.pageCount ?? null,
      input.createdBy ?? null,
      now,
      now,
    );

  return id;
}

export function listRamsDocuments() {
  return getDb()
    .prepare(
      `SELECT d.*,
              (SELECT COUNT(*) FROM rams_sections s WHERE s.rams_document_id = d.id) AS section_count,
              (SELECT COUNT(*) FROM rams_chunks c WHERE c.rams_document_id = d.id) AS chunk_count
       FROM rams_documents d
       ORDER BY d.created_at DESC`,
    )
    .all() as Array<RamsDocumentRow & { section_count: number; chunk_count: number }>;
}

export function getRamsDocument(id: string) {
  return getDb().prepare("SELECT * FROM rams_documents WHERE id = ?").get(id) as RamsDocumentRow | undefined;
}

export function updateRamsProcessingStatus(
  id: string,
  status: RamsProcessingStatus,
  options: { error?: string | null; textStatus?: RamsTextExtractionStatus; pageCount?: number | null } = {},
) {
  getDb()
    .prepare(
      `UPDATE rams_documents
       SET processing_status = ?,
           processing_error = ?,
           text_extraction_status = COALESCE(?, text_extraction_status),
           page_count = COALESCE(?, page_count),
           updated_at = ?
       WHERE id = ?`,
    )
    .run(status, options.error ?? null, options.textStatus ?? null, options.pageCount ?? null, new Date().toISOString(), id);
}

export function replaceRamsProcessedData(
  documentId: string,
  input: { sections: Array<Omit<RamsSectionRow, "created_at" | "rams_document_id">>; chunks: RamsChunkInput[] },
) {
  const now = new Date().toISOString();
  const insertSection = getDb().prepare(
    `INSERT INTO rams_sections (id, rams_document_id, title, start_page, end_page, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertChunk = getDb().prepare(
    `INSERT INTO rams_chunks
       (id, rams_document_id, section_id, page_number, end_page_number, chunk_index, text, normalised_text, embedding, token_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertBox = getDb().prepare(
    `INSERT INTO rams_chunk_boxes
       (id, chunk_id, page_number, text, x, y, width, height, page_width, page_height, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const run = getDb().transaction(() => {
    getDb().prepare("DELETE FROM rams_review_evidence WHERE rams_document_id = ?").run(documentId);
    getDb().prepare("DELETE FROM rams_sections WHERE rams_document_id = ?").run(documentId);
    getDb().prepare("DELETE FROM rams_chunks WHERE rams_document_id = ?").run(documentId);

    for (const section of input.sections) {
      insertSection.run(section.id, documentId, section.title, section.start_page, section.end_page, section.sort_order, now);
    }

    for (const chunk of input.chunks) {
      const chunkId = chunk.id ?? randomUUID();
      insertChunk.run(
        chunkId,
        documentId,
        chunk.sectionId ?? null,
        chunk.pageNumber,
        chunk.endPageNumber,
        chunk.chunkIndex,
        chunk.text,
        chunk.normalisedText,
        chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        chunk.tokenCount,
        now,
      );
      for (const box of chunk.boxes) {
        insertBox.run(
          randomUUID(),
          chunkId,
          box.pageNumber,
          box.text,
          box.x,
          box.y,
          box.width,
          box.height,
          box.pageWidth,
          box.pageHeight,
          box.sortOrder,
        );
      }
    }
  });

  run();
}

export function listRamsSections(documentId: string) {
  return getDb()
    .prepare("SELECT * FROM rams_sections WHERE rams_document_id = ? ORDER BY sort_order")
    .all(documentId) as RamsSectionRow[];
}

export function listRamsChunks(documentId: string) {
  return getDb()
    .prepare(
      `SELECT c.*, s.title AS section_title
       FROM rams_chunks c
       LEFT JOIN rams_sections s ON s.id = c.section_id
       WHERE c.rams_document_id = ?
       ORDER BY c.chunk_index`,
    )
    .all(documentId) as RamsChunkRow[];
}

export function getChunkBoxes(chunkIds: string[]) {
  if (chunkIds.length === 0) return [] as RamsChunkBoxRow[];
  const placeholders = chunkIds.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM rams_chunk_boxes WHERE chunk_id IN (${placeholders}) ORDER BY chunk_id, sort_order`)
    .all(...chunkIds) as RamsChunkBoxRow[];
}

export function createRamsChatThread(documentId: string, title: string, adminId?: string | null) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO rams_chat_threads (id, rams_document_id, admin_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, documentId, adminId ?? null, title, now, now);
  return id;
}

export function addRamsChatMessage(input: { threadId: string; role: "user" | "assistant"; message: string; model?: string | null }) {
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO rams_chat_messages (id, thread_id, role, message, model) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.threadId, input.role, input.message, input.model ?? null);
  return id;
}

export function addRamsChatCitations(messageId: string, chunkIds: string[]) {
  const stmt = getDb().prepare("INSERT INTO rams_chat_citations (id, message_id, chunk_id, citation_order) VALUES (?, ?, ?, ?)");
  const run = getDb().transaction(() => {
    chunkIds.forEach((chunkId, index) => stmt.run(randomUUID(), messageId, chunkId, index + 1));
  });
  run();
}

export function upsertRamsReviewEvidence(input: {
  documentId: string;
  reviewQuestionKey: string;
  answer: string;
  comment?: string | null;
  chunkId?: string | null;
  confidence?: number | null;
  decisionOrigin: RamsDecisionOrigin;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO rams_review_evidence
       (id, rams_document_id, review_question_key, answer, comment, chunk_id, confidence, decision_origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(rams_document_id, review_question_key, chunk_id)
       DO UPDATE SET answer = excluded.answer,
                     comment = excluded.comment,
                     confidence = excluded.confidence,
                     decision_origin = excluded.decision_origin,
                     updated_at = excluded.updated_at`,
    )
    .run(
      id,
      input.documentId,
      input.reviewQuestionKey,
      input.answer,
      input.comment ?? null,
      input.chunkId ?? null,
      input.confidence ?? null,
      input.decisionOrigin,
      now,
      now,
    );
}
