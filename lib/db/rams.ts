import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { resolvePermitContractor } from "@/lib/db/contractors";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { getSite } from "@/lib/db/sites";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  siteId?: string | null;
  siteName?: string | null;
  projectId?: string | null;
  contractorId?: string | null;
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

export type RamsDocumentWithCounts = RamsDocumentRow & { section_count: number; chunk_count: number };
export type RamsDocumentListOptions = { siteId?: string | null };

function shouldUseSupabaseRamsDb() {
  const provider = env("RAMS_DATABASE_PROVIDER", "sqlite");
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("RAMS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function jsonEmbedding(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function assertNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function isMissingRelationError(error: { message: string } | null) {
  if (!error) return false;
  return /schema cache|does not exist|could not find the table/i.test(error.message);
}

function isMissingSiteIdError(error: { message: string } | null) {
  if (!error) return false;
  return /site_id|contractor_id|Could not find .*(site_id|contractor_id)/i.test(error.message);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

async function filterRowsByLegacySiteName<T extends { site_name: string | null; site_id?: string | null }>(rows: T[], siteId?: string | null) {
  if (!siteId) return rows.map((row) => ({ ...row, site_id: row.site_id ?? null }));

  const site = await getSite(siteId);
  if (!site) return [];

  const candidates = [site.id, site.name, site.location, site.project_name].filter((item): item is string => Boolean(item)).map((item) => item.toLowerCase());
  return rows
    .filter((row) => {
      const siteName = row.site_name?.toLowerCase() ?? "";
      if (!siteName) return false;
      return row.site_id === siteId || candidates.some((candidate) => siteName.includes(candidate) || candidate.includes(siteName));
    })
    .map((row) => ({ ...row, site_id: row.site_id ?? siteId }));
}

export async function createRamsDocument(input: CreateRamsDocumentInput) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const resolvedContractor = input.siteId
    ? await resolvePermitContractor({
        siteId: input.siteId,
        projectId: input.projectId ?? null,
        contractorId: input.contractorId ?? null,
        contractorName: input.contractor,
      })
    : { contractorId: input.contractorId ?? null, contractorName: input.contractor };

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const documentPayload = {
      id,
      title: input.title,
      site_id: input.siteId ?? null,
      site_name: input.siteName ?? null,
      contractor_id: resolvedContractor.contractorId,
      contractor: resolvedContractor.contractorName,
      document_reference: input.documentReference ?? null,
      revision: input.revision ?? null,
      revision_date: input.revisionDate ?? null,
      file_name: input.fileName,
      storage_key: input.storageKey,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      page_count: input.pageCount ?? null,
      processing_status: "UPLOADED",
      text_extraction_status: "PENDING",
      created_by: input.createdBy ?? null,
      created_at: now,
      updated_at: now,
    };
    const { error } = await supabase.from("rams_documents").insert(documentPayload);
    if (isMissingSiteIdError(error)) {
      const { site_id: removedSiteId, contractor_id: removedContractorId, ...legacyPayload } = documentPayload;
      void removedSiteId;
      void removedContractorId;
      assertNoError((await supabase.from("rams_documents").insert(legacyPayload)).error, "Unable to create RAMS document");
    } else {
      assertNoError(error, "Unable to create RAMS document");
    }
    return id;
  }

  getDb()
    .prepare(
      `INSERT INTO rams_documents
       (id, title, site_id, site_name, contractor_id, contractor, document_reference, revision, revision_date, file_name, storage_key,
        file_size, mime_type, page_count, processing_status, text_extraction_status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED', 'PENDING', ?, ?, ?)`,
    )
    .run(
      id,
      input.title,
      input.siteId ?? null,
      input.siteName ?? null,
      resolvedContractor.contractorId,
      resolvedContractor.contractorName,
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

export async function listRamsDocuments(options: RamsDocumentListOptions = {}): Promise<RamsDocumentWithCounts[]> {
  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("rams_documents_with_counts").select("*").order("created_at", { ascending: false });
    if (options.siteId) query = query.eq("site_id", options.siteId);
    const { data, error } = await query;
    if (!isMissingRelationError(error)) {
      if (isMissingSiteIdError(error)) {
        const { data: legacyData, error: legacyError } = await supabase.from("rams_documents_with_counts").select("*").order("created_at", { ascending: false });
        assertNoError(legacyError, "Unable to list RAMS documents");
        return (await filterRowsByLegacySiteName((legacyData ?? []) as RamsDocumentWithCounts[], options.siteId)) as RamsDocumentWithCounts[];
      }
      assertNoError(error, "Unable to list RAMS documents");
      return (data ?? []) as RamsDocumentWithCounts[];
    }

    let documentsQuery = supabase.from("rams_documents").select("*").order("created_at", { ascending: false });
    if (options.siteId) documentsQuery = documentsQuery.eq("site_id", options.siteId);
    const { data: documents, error: documentsError } = await documentsQuery;
    if (isMissingSiteIdError(documentsError)) {
      const { data: legacyDocuments, error: legacyDocumentsError } = await supabase.from("rams_documents").select("*").order("created_at", { ascending: false });
      assertNoError(legacyDocumentsError, "Unable to list RAMS documents");
      const rows = await filterRowsByLegacySiteName((legacyDocuments ?? []) as RamsDocumentRow[], options.siteId);
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      const sectionCounts = new Map<string, number>();
      const chunkCounts = new Map<string, number>();

      for (const idBatch of chunkArray(ids, 100)) {
        const { data: sections, error: sectionsError } = await supabase.from("rams_sections").select("rams_document_id").in("rams_document_id", idBatch);
        assertNoError(sectionsError, "Unable to count RAMS sections");
        for (const section of (sections ?? []) as Array<{ rams_document_id: string }>) {
          sectionCounts.set(section.rams_document_id, (sectionCounts.get(section.rams_document_id) ?? 0) + 1);
        }

        const { data: chunks, error: chunksError } = await supabase.from("rams_chunks").select("rams_document_id").in("rams_document_id", idBatch);
        assertNoError(chunksError, "Unable to count RAMS chunks");
        for (const chunk of (chunks ?? []) as Array<{ rams_document_id: string }>) {
          chunkCounts.set(chunk.rams_document_id, (chunkCounts.get(chunk.rams_document_id) ?? 0) + 1);
        }
      }

      return rows.map((row) => ({
        ...row,
        section_count: sectionCounts.get(row.id) ?? 0,
        chunk_count: chunkCounts.get(row.id) ?? 0,
      }));
    }
    assertNoError(documentsError, "Unable to list RAMS documents");
    const rows = (documents ?? []) as RamsDocumentRow[];
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const sectionCounts = new Map<string, number>();
    const chunkCounts = new Map<string, number>();

    for (const idBatch of chunkArray(ids, 100)) {
      const { data: sections, error: sectionsError } = await supabase.from("rams_sections").select("rams_document_id").in("rams_document_id", idBatch);
      assertNoError(sectionsError, "Unable to count RAMS sections");
      for (const section of (sections ?? []) as Array<{ rams_document_id: string }>) {
        sectionCounts.set(section.rams_document_id, (sectionCounts.get(section.rams_document_id) ?? 0) + 1);
      }

      const { data: chunks, error: chunksError } = await supabase.from("rams_chunks").select("rams_document_id").in("rams_document_id", idBatch);
      assertNoError(chunksError, "Unable to count RAMS chunks");
      for (const chunk of (chunks ?? []) as Array<{ rams_document_id: string }>) {
        chunkCounts.set(chunk.rams_document_id, (chunkCounts.get(chunk.rams_document_id) ?? 0) + 1);
      }
    }

    return rows.map((row) => ({
      ...row,
      section_count: sectionCounts.get(row.id) ?? 0,
      chunk_count: chunkCounts.get(row.id) ?? 0,
    }));
  }

  const siteFilter = options.siteId ? "WHERE d.site_id = ?" : "";
  return getDb()
    .prepare(
      `SELECT d.*,
              (SELECT COUNT(*) FROM rams_sections s WHERE s.rams_document_id = d.id) AS section_count,
              (SELECT COUNT(*) FROM rams_chunks c WHERE c.rams_document_id = d.id) AS chunk_count
       FROM rams_documents d
       ${siteFilter}
       ORDER BY d.created_at DESC`,
    )
    .all(...(options.siteId ? [options.siteId] : [])) as RamsDocumentWithCounts[];
}

export async function getRamsDocument(id: string): Promise<RamsDocumentRow | undefined> {
  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("rams_documents").select("*").eq("id", id).maybeSingle();
    assertNoError(error, "Unable to get RAMS document");
    return (data as RamsDocumentRow | null) ?? undefined;
  }

  return getDb().prepare("SELECT * FROM rams_documents WHERE id = ?").get(id) as RamsDocumentRow | undefined;
}

export async function updateRamsProcessingStatus(
  id: string,
  status: RamsProcessingStatus,
  options: { error?: string | null; textStatus?: RamsTextExtractionStatus; pageCount?: number | null } = {},
) {
  const update = {
    processing_status: status,
    processing_error: options.error ?? null,
    updated_at: new Date().toISOString(),
    ...(options.textStatus ? { text_extraction_status: options.textStatus } : {}),
    ...(options.pageCount == null ? {} : { page_count: options.pageCount }),
  };

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("rams_documents").update(update).eq("id", id);
    assertNoError(error, "Unable to update RAMS processing status");
    return;
  }

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
    .run(status, options.error ?? null, options.textStatus ?? null, options.pageCount ?? null, update.updated_at, id);
}

export async function replaceRamsProcessedData(
  documentId: string,
  input: { sections: Array<Omit<RamsSectionRow, "created_at" | "rams_document_id">>; chunks: RamsChunkInput[] },
) {
  const now = new Date().toISOString();

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError((await supabase.from("rams_chunks").delete().eq("rams_document_id", documentId)).error, "Unable to delete RAMS chunks");
    assertNoError((await supabase.from("rams_sections").delete().eq("rams_document_id", documentId)).error, "Unable to delete RAMS sections");

    if (input.sections.length > 0) {
      const { error } = await supabase.from("rams_sections").insert(
        input.sections.map((section) => ({
          id: section.id,
          rams_document_id: documentId,
          title: section.title,
          start_page: section.start_page,
          end_page: section.end_page,
          sort_order: section.sort_order,
          created_at: now,
        })),
      );
      assertNoError(error, "Unable to insert RAMS sections");
    }

    const boxRows: Array<RamsChunkBoxRow> = [];
    for (const chunkBatch of chunkArray(input.chunks, 250)) {
      const chunkRows = chunkBatch.map((chunk) => {
        const chunkId = chunk.id ?? randomUUID();
        for (const box of chunk.boxes) {
          boxRows.push({
            id: randomUUID(),
            chunk_id: chunkId,
            page_number: box.pageNumber,
            text: box.text,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            page_width: box.pageWidth,
            page_height: box.pageHeight,
            sort_order: box.sortOrder,
          });
        }
        return {
          id: chunkId,
          rams_document_id: documentId,
          section_id: chunk.sectionId ?? null,
          page_number: chunk.pageNumber,
          end_page_number: chunk.endPageNumber,
          chunk_index: chunk.chunkIndex,
          text: chunk.text,
          normalised_text: chunk.normalisedText,
          embedding: chunk.embedding ?? null,
          token_count: chunk.tokenCount,
          created_at: now,
        };
      });
      const { error } = await supabase.from("rams_chunks").insert(chunkRows);
      assertNoError(error, "Unable to insert RAMS chunks");
    }

    for (const boxBatch of chunkArray(boxRows, 750)) {
      const { error } = await supabase.from("rams_chunk_boxes").insert(boxBatch);
      assertNoError(error, "Unable to insert RAMS chunk boxes");
    }
    return;
  }

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
        insertBox.run(randomUUID(), chunkId, box.pageNumber, box.text, box.x, box.y, box.width, box.height, box.pageWidth, box.pageHeight, box.sortOrder);
      }
    }
  });

  run();
}

export async function listRamsSections(documentId: string): Promise<RamsSectionRow[]> {
  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("rams_sections").select("*").eq("rams_document_id", documentId).order("sort_order");
    assertNoError(error, "Unable to list RAMS sections");
    return (data ?? []) as RamsSectionRow[];
  }

  return getDb().prepare("SELECT * FROM rams_sections WHERE rams_document_id = ? ORDER BY sort_order").all(documentId) as RamsSectionRow[];
}

export async function listRamsChunks(documentId: string): Promise<RamsChunkRow[]> {
  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("rams_chunks").select("*").eq("rams_document_id", documentId).order("chunk_index");
    assertNoError(error, "Unable to list RAMS chunks");
    const chunks = (data ?? []) as Array<RamsChunkRow & { embedding: unknown }>;
    const sections = await listRamsSections(documentId);
    const titleById = new Map(sections.map((section) => [section.id, section.title]));
    return chunks.map((chunk) => ({
      ...chunk,
      embedding: jsonEmbedding(chunk.embedding),
      section_title: chunk.section_id ? titleById.get(chunk.section_id) ?? null : null,
    }));
  }

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

export async function getChunkBoxes(chunkIds: string[]): Promise<RamsChunkBoxRow[]> {
  if (chunkIds.length === 0) return [];

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const rows: RamsChunkBoxRow[] = [];
    for (const ids of chunkArray(chunkIds, 100)) {
      const { data, error } = await supabase.from("rams_chunk_boxes").select("*").in("chunk_id", ids).order("sort_order");
      assertNoError(error, "Unable to get RAMS chunk boxes");
      rows.push(...((data ?? []) as RamsChunkBoxRow[]));
    }
    return rows.sort((left, right) => left.chunk_id.localeCompare(right.chunk_id) || left.sort_order - right.sort_order);
  }

  const placeholders = chunkIds.map(() => "?").join(",");
  return getDb().prepare(`SELECT * FROM rams_chunk_boxes WHERE chunk_id IN (${placeholders}) ORDER BY chunk_id, sort_order`).all(...chunkIds) as RamsChunkBoxRow[];
}

export async function createRamsChatThread(documentId: string, title: string, adminId?: string | null) {
  const id = randomUUID();
  const now = new Date().toISOString();

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("rams_chat_threads")
      .insert({ id, rams_document_id: documentId, admin_id: adminId ?? null, title, created_at: now, updated_at: now });
    assertNoError(error, "Unable to create RAMS chat thread");
    return id;
  }

  getDb()
    .prepare(
      `INSERT INTO rams_chat_threads (id, rams_document_id, admin_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, documentId, adminId ?? null, title, now, now);
  return id;
}

export async function addRamsChatMessage(input: { threadId: string; role: "user" | "assistant"; message: string; model?: string | null }) {
  const id = randomUUID();

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("rams_chat_messages")
      .insert({ id, thread_id: input.threadId, role: input.role, message: input.message, model: input.model ?? null });
    assertNoError(error, "Unable to add RAMS chat message");
    return id;
  }

  getDb()
    .prepare("INSERT INTO rams_chat_messages (id, thread_id, role, message, model) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.threadId, input.role, input.message, input.model ?? null);
  return id;
}

export async function addRamsChatCitations(messageId: string, chunkIds: string[]) {
  if (chunkIds.length === 0) return;

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("rams_chat_citations").insert(
      chunkIds.map((chunkId, index) => ({
        id: randomUUID(),
        message_id: messageId,
        chunk_id: chunkId,
        citation_order: index + 1,
      })),
    );
    assertNoError(error, "Unable to add RAMS chat citations");
    return;
  }

  const stmt = getDb().prepare("INSERT INTO rams_chat_citations (id, message_id, chunk_id, citation_order) VALUES (?, ?, ?, ?)");
  const run = getDb().transaction(() => {
    chunkIds.forEach((chunkId, index) => stmt.run(randomUUID(), messageId, chunkId, index + 1));
  });
  run();
}

export async function upsertRamsReviewEvidence(input: {
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
  const row = {
    id,
    rams_document_id: input.documentId,
    review_question_key: input.reviewQuestionKey,
    answer: input.answer,
    comment: input.comment ?? null,
    chunk_id: input.chunkId ?? null,
    confidence: input.confidence ?? null,
    decision_origin: input.decisionOrigin,
    created_at: now,
    updated_at: now,
  };

  if (shouldUseSupabaseRamsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("rams_review_evidence").upsert(row, {
      onConflict: "rams_document_id,review_question_key,chunk_id",
    });
    assertNoError(error, "Unable to upsert RAMS review evidence");
    return;
  }

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
      row.id,
      row.rams_document_id,
      row.review_question_key,
      row.answer,
      row.comment,
      row.chunk_id,
      row.confidence,
      row.decision_origin,
      row.created_at,
      row.updated_at,
    );
}
