import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { getDb, UPLOADS_DIR } from "@/lib/db";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { getSubmissionStorageProvider } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSite, resolveSiteIdFromName } from "@/lib/db/sites";
import { isOperativeDatabaseSetupError, syncInductionSubmissionOperative } from "@/lib/db/operatives";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";
import type { EvidencePrintTransform, EvidenceType } from "@/types/evidence";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

function mimeFromDataUrl(dataUrl: string) {
  return dataUrl.match(/^data:([^;]+)/)?.[1]?.toLowerCase() ?? "";
}

export interface SubmissionRow {
  id: string;
  reference: string | null;
  site_id: string | null;
  full_name: string | null;
  company_name: string | null;
  contractor_id: string | null;
  operative_id: string | null;
  site_name: string | null;
  declaration_date: string | null;
  print_review_status: string;
  print_data: string;
  pinned: number;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface EvidenceDocRow {
  id: string;
  submission_id: string;
  document_type: string;
  original_name: string | null;
  mime_type: string | null;
  storage_path: string | null;
  source_width: number | null;
  source_height: number | null;
  fit_mode: string;
  offset_x: number;
  offset_y: number;
  scale: number;
  rotation: number;
  updated_at: string;
  updated_by: string | null;
}

export type SubmissionListRow = Omit<SubmissionRow, "print_data"> & { evidence_count: number };
export type SubmissionListOptions = { siteId?: string | null };

export function transformFromRow(row: EvidenceDocRow): EvidencePrintTransform {
  return {
    fitMode: (row.fit_mode as EvidencePrintTransform["fitMode"]) || "fit",
    offsetX: row.offset_x ?? 0,
    offsetY: row.offset_y ?? 0,
    scale: row.scale ?? 1,
    rotation: (row.rotation as EvidencePrintTransform["rotation"]) || 0,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

function shouldUseSupabaseSubmissionsDb() {
  const provider = env("SUBMISSIONS_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("SUBMISSIONS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
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
  return /site_id|Could not find .*site_id/i.test(error.message);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function dataUrlToStoredDocument(document: NonNullable<UHSF1601PrintData["uploadedDocuments"]>[number]) {
  const comma = (document.dataUrl ?? "").indexOf(",");
  if (comma === -1) return null;

  const mime = mimeFromDataUrl(document.dataUrl ?? "");
  const ext = EXT_BY_MIME[mime] ?? "bin";
  return {
    document,
    mime,
    ext,
    buffer: Buffer.from(document.dataUrl!.slice(comma + 1), "base64"),
  };
}

function isSupabaseStorageKey(storagePath: string) {
  return !path.isAbsolute(storagePath);
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

function inductionStatusFromReviewStatus(status: string) {
  return status === "ready" ? "APPROVED" : "PENDING_REVIEW";
}

async function saveSubmissionRegistryLinks(submissionId: string, contractorId: string, operativeId: string) {
  const now = new Date().toISOString();
  if (shouldUseSupabaseSubmissionsDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("submissions")
      .update({ contractor_id: contractorId, operative_id: operativeId, updated_at: now })
      .eq("id", submissionId);
    assertNoError(error, "Unable to link submission to operative");
    return;
  }

  getDb()
    .prepare("UPDATE submissions SET contractor_id = ?, operative_id = ?, updated_at = ? WHERE id = ?")
    .run(contractorId, operativeId, now, submissionId);
}

async function syncSubmissionRegistryLinks(input: {
  submissionId: string;
  siteId: string | null;
  printData: UHSF1601PrintData;
  reviewStatus: string;
  actor?: string | null;
}) {
  try {
    const site = input.siteId ? await getSite(input.siteId) : null;
    const linked = await syncInductionSubmissionOperative({
      submissionId: input.submissionId,
      siteId: input.siteId,
      projectId: site?.project_id ?? null,
      companyName: input.printData.companyName,
      fullName: input.printData.fullName,
      phone: input.printData.contactNumber,
      role: input.printData.occupation,
      cscsCardNumber: input.printData.cscsCardNumber,
      cscsExpiry: input.printData.cscsExpiry,
      inductionStatus: inductionStatusFromReviewStatus(input.reviewStatus),
      actor: input.actor,
    });
    if (linked) await saveSubmissionRegistryLinks(input.submissionId, linked.contractorId, linked.operativeId);
    return linked;
  } catch (error) {
    if (isOperativeDatabaseSetupError(error)) {
      console.warn(error.message);
      return null;
    }
    console.warn(error);
    return null;
  }
}

export async function loadEvidenceDocument(document: EvidenceDocRow) {
  if (!document.storage_path) throw new Error("Evidence document has no stored object.");

  if (shouldUseSupabaseSubmissionsDb() || isSupabaseStorageKey(document.storage_path)) {
    const object = await getSubmissionStorageProvider().getObject({ key: document.storage_path });
    return {
      buffer: object.buffer,
      fileName: document.original_name ?? object.fileName,
      mimeType: document.mime_type ?? object.mimeType,
    };
  }

  return {
    buffer: await fsp.readFile(document.storage_path),
    fileName: document.original_name ?? path.basename(document.storage_path),
    mimeType: document.mime_type ?? "application/octet-stream",
  };
}

export async function persistSubmission(printData: UHSF1601PrintData): Promise<{ id: string; reference: string }> {
  const id = randomUUID();
  const reference = `UHSF-${id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const siteId = await resolveSiteIdFromName(printData.siteName);

  if (shouldUseSupabaseSubmissionsDb()) {
    const storage = getSubmissionStorageProvider();
    const evidenceRows: EvidenceDocRow[] = [];

    for (const item of printData.uploadedDocuments ?? []) {
      const source = dataUrlToStoredDocument(item);
      if (!source) continue;

      const stored = await storage.putObject({
        keyPrefix: `submissions/${id}`,
        fileName: `${source.document.id}.${source.ext}`,
        mimeType: source.mime,
        buffer: source.buffer,
      });

      evidenceRows.push({
        id: randomUUID(),
        submission_id: id,
        document_type: source.document.id,
        original_name: source.document.label,
        mime_type: source.mime,
        storage_path: stored.key,
        source_width: null,
        source_height: null,
        fit_mode: "fit",
        offset_x: 0,
        offset_y: 0,
        scale: 1,
        rotation: 0,
        updated_at: now,
        updated_by: null,
      });
    }

    const supabase = createSupabaseAdminClient();
    const submissionPayload = {
      id,
      reference,
      site_id: siteId,
      full_name: printData.fullName ?? null,
      company_name: printData.companyName ?? null,
      site_name: printData.siteName ?? null,
      declaration_date: printData.declarationDate ?? null,
      print_review_status: "not_reviewed",
      print_data: JSON.stringify({ ...printData, uploadedDocuments: [] }),
      pinned: 0,
      is_sample: 0,
      created_at: now,
      updated_at: now,
    };
    const insertResult = await supabase.from("submissions").insert(submissionPayload);
    if (isMissingSiteIdError(insertResult.error)) {
      const { site_id: removedSiteId, ...legacyPayload } = submissionPayload;
      void removedSiteId;
      assertNoError((await supabase.from("submissions").insert(legacyPayload)).error, "Unable to create submission");
    } else {
      assertNoError(insertResult.error, "Unable to create submission");
    }

    if (evidenceRows.length > 0) {
      assertNoError((await supabase.from("evidence_documents").insert(evidenceRows)).error, "Unable to create evidence documents");
    }

    await syncSubmissionRegistryLinks({
      submissionId: id,
      siteId,
      printData,
      reviewStatus: "not_reviewed",
    });

    return { id, reference };
  }

  const subDir = path.join(UPLOADS_DIR, id);
  fs.mkdirSync(subDir, { recursive: true });

  const insertSubmission = getDb().prepare(
    `INSERT INTO submissions
       (id, reference, site_id, full_name, company_name, site_name, declaration_date, print_review_status, print_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'not_reviewed', ?, ?, ?)`,
  );

  const insertEvidence = getDb().prepare(
    `INSERT INTO evidence_documents
       (id, submission_id, document_type, original_name, mime_type, storage_path, source_width, source_height, fit_mode, offset_x, offset_y, scale, rotation, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'fit', 0, 0, 1, 0, ?, NULL)`,
  );

  const run = getDb().transaction(() => {
    insertSubmission.run(
      id,
      reference,
      siteId,
      printData.fullName ?? null,
      printData.companyName ?? null,
      printData.siteName ?? null,
      printData.declarationDate ?? null,
      JSON.stringify({ ...printData, uploadedDocuments: [] }),
      now,
      now,
    );

    for (const doc of printData.uploadedDocuments ?? []) {
      const source = dataUrlToStoredDocument(doc);
      if (!source) continue;

      const filePath = path.join(/* turbopackIgnore: true */ subDir, `${doc.id}.${source.ext}`);
      fs.writeFileSync(filePath, source.buffer);

      insertEvidence.run(randomUUID(), id, doc.id, doc.label, source.mime, filePath, now);
    }
  });

  run();
  await syncSubmissionRegistryLinks({
    submissionId: id,
    siteId,
    printData,
    reviewStatus: "not_reviewed",
  });

  return { id, reference };
}

export async function listSubmissions(options: SubmissionListOptions = {}): Promise<SubmissionListRow[]> {
  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("submissions_with_counts")
      .select("id, reference, site_id, full_name, company_name, site_name, declaration_date, print_review_status, pinned, is_sample, created_at, updated_at, evidence_count")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (options.siteId) query = query.eq("site_id", options.siteId);
    const { data, error } = await query;
    if (!isMissingRelationError(error)) {
      if (isMissingSiteIdError(error)) {
        const legacyQuery = supabase
          .from("submissions_with_counts")
          .select("id, reference, full_name, company_name, site_name, declaration_date, print_review_status, pinned, is_sample, created_at, updated_at, evidence_count")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false });
        const { data: legacyData, error: legacyError } = await legacyQuery;
        assertNoError(legacyError, "Unable to list submissions");
        return (await filterRowsByLegacySiteName((legacyData ?? []) as SubmissionListRow[], options.siteId)) as SubmissionListRow[];
      }
      assertNoError(error, "Unable to list submissions");
      return (data ?? []) as SubmissionListRow[];
    }

    let fallbackQuery = supabase
      .from("submissions")
      .select("id, reference, site_id, full_name, company_name, site_name, declaration_date, print_review_status, pinned, is_sample, created_at, updated_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (options.siteId) fallbackQuery = fallbackQuery.eq("site_id", options.siteId);
    const { data: submissions, error: submissionsError } = await fallbackQuery;
    if (isMissingSiteIdError(submissionsError)) {
      const { data: legacySubmissions, error: legacySubmissionsError } = await supabase
        .from("submissions")
        .select("id, reference, full_name, company_name, site_name, declaration_date, print_review_status, pinned, is_sample, created_at, updated_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      assertNoError(legacySubmissionsError, "Unable to list submissions");
      const rows = await filterRowsByLegacySiteName((legacySubmissions ?? []) as Array<Omit<SubmissionRow, "print_data">>, options.siteId);
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      const evidenceCounts = new Map<string, number>();
      for (const idBatch of chunkArray(ids, 100)) {
        const { data: evidence, error: evidenceError } = await supabase
          .from("evidence_documents")
          .select("submission_id")
          .in("submission_id", idBatch)
          .not("storage_path", "is", null);
        assertNoError(evidenceError, "Unable to count evidence documents");
        for (const item of (evidence ?? []) as Array<{ submission_id: string }>) {
          evidenceCounts.set(item.submission_id, (evidenceCounts.get(item.submission_id) ?? 0) + 1);
        }
      }

      return rows.map((row) => ({
        ...row,
        evidence_count: evidenceCounts.get(row.id) ?? 0,
      })) as SubmissionListRow[];
    }
    assertNoError(submissionsError, "Unable to list submissions");
    const rows = (submissions ?? []) as Array<Omit<SubmissionRow, "print_data">>;
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const evidenceCounts = new Map<string, number>();
    for (const idBatch of chunkArray(ids, 100)) {
      const { data: evidence, error: evidenceError } = await supabase
        .from("evidence_documents")
        .select("submission_id")
        .in("submission_id", idBatch)
        .not("storage_path", "is", null);
      assertNoError(evidenceError, "Unable to count evidence documents");
      for (const item of (evidence ?? []) as Array<{ submission_id: string }>) {
        evidenceCounts.set(item.submission_id, (evidenceCounts.get(item.submission_id) ?? 0) + 1);
      }
    }

    return rows.map((row) => ({
      ...row,
      evidence_count: evidenceCounts.get(row.id) ?? 0,
    })) as SubmissionListRow[];
  }

  const siteFilter = options.siteId ? "WHERE s.site_id = ?" : "";
  return getDb()
    .prepare(
      `SELECT s.id, s.reference, s.site_id, s.full_name, s.company_name, s.site_name, s.declaration_date,
              s.print_review_status, s.pinned, s.is_sample, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM evidence_documents e WHERE e.submission_id = s.id AND e.storage_path IS NOT NULL) AS evidence_count
       FROM submissions s
       ${siteFilter}
       ORDER BY s.pinned DESC, s.created_at DESC`,
    )
    .all(...(options.siteId ? [options.siteId] : [])) as SubmissionListRow[];
}

export async function getSubmission(id: string): Promise<{ row: SubmissionRow; evidence: EvidenceDocRow[] } | null> {
  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle();
    assertNoError(error, "Unable to get submission");
    if (!data) return null;

    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence_documents")
      .select("*")
      .eq("submission_id", id)
      .order("document_type");
    assertNoError(evidenceError, "Unable to get evidence documents");

    return { row: data as SubmissionRow, evidence: (evidence ?? []) as EvidenceDocRow[] };
  }

  const row = getDb().prepare("SELECT * FROM submissions WHERE id = ?").get(id) as SubmissionRow | undefined;
  if (!row) return null;

  const evidence = getDb()
    .prepare("SELECT * FROM evidence_documents WHERE submission_id = ? ORDER BY document_type")
    .all(id) as EvidenceDocRow[];

  return { row, evidence };
}

export async function saveEvidenceTransforms(
  submissionId: string,
  transforms: Partial<Record<EvidenceType, EvidencePrintTransform>>,
  updatedBy: string,
) {
  const now = new Date().toISOString();

  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    for (const [type, transform] of Object.entries(transforms) as Array<[EvidenceType, EvidencePrintTransform]>) {
      const { error } = await supabase
        .from("evidence_documents")
        .update({
          fit_mode: transform.fitMode,
          offset_x: transform.offsetX,
          offset_y: transform.offsetY,
          scale: transform.scale,
          rotation: transform.rotation,
          updated_at: now,
          updated_by: updatedBy,
        })
        .eq("submission_id", submissionId)
        .eq("document_type", type);
      assertNoError(error, "Unable to update evidence transform");
    }
    assertNoError((await supabase.from("submissions").update({ updated_at: now }).eq("id", submissionId)).error, "Unable to update submission");
    return;
  }

  const stmt = getDb().prepare(
    `UPDATE evidence_documents
     SET fit_mode = ?, offset_x = ?, offset_y = ?, scale = ?, rotation = ?, updated_at = ?, updated_by = ?
     WHERE submission_id = ? AND document_type = ?`,
  );

  const run = getDb().transaction(() => {
    for (const [type, transform] of Object.entries(transforms) as Array<[EvidenceType, EvidencePrintTransform]>) {
      stmt.run(
        transform.fitMode,
        transform.offsetX,
        transform.offsetY,
        transform.scale,
        transform.rotation,
        now,
        updatedBy,
        submissionId,
        type,
      );
    }
    getDb().prepare("UPDATE submissions SET updated_at = ? WHERE id = ?").run(now, submissionId);
  });

  run();
}

export async function updateSubmissionFormData(submissionId: string, patch: Partial<UHSF1601PrintData>) {
  const result = await getSubmission(submissionId);
  if (!result) return false;

  const existing = JSON.parse(result.row.print_data) as UHSF1601PrintData;
  const next: UHSF1601PrintData = { ...existing, ...patch };
  const now = new Date().toISOString();
  const siteId = await resolveSiteIdFromName(next.siteName);

  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    const updatePayload = {
      site_id: siteId,
      print_data: JSON.stringify(next),
      full_name: next.fullName ?? null,
      company_name: next.companyName ?? null,
      site_name: next.siteName ?? null,
      declaration_date: next.declarationDate ?? null,
      updated_at: now,
    };
    const { error } = await supabase
      .from("submissions")
      .update(updatePayload)
      .eq("id", submissionId);
    if (isMissingSiteIdError(error)) {
      const { site_id: removedSiteId, ...legacyPayload } = updatePayload;
      void removedSiteId;
      assertNoError((await supabase.from("submissions").update(legacyPayload).eq("id", submissionId)).error, "Unable to update submission form data");
    } else {
      assertNoError(error, "Unable to update submission form data");
    }
    await syncSubmissionRegistryLinks({
      submissionId,
      siteId,
      printData: next,
      reviewStatus: result.row.print_review_status,
      actor: "Admin Records",
    });
    return true;
  }

  getDb()
    .prepare(
      `UPDATE submissions
       SET site_id = ?, print_data = ?, full_name = ?, company_name = ?, site_name = ?, declaration_date = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      siteId,
      JSON.stringify(next),
      next.fullName ?? null,
      next.companyName ?? null,
      next.siteName ?? null,
      next.declarationDate ?? null,
      now,
      submissionId,
    );

  await syncSubmissionRegistryLinks({
    submissionId,
    siteId,
    printData: next,
    reviewStatus: result.row.print_review_status,
    actor: "Admin Records",
  });

  return true;
}

export async function setPrintReviewStatus(submissionId: string, status: "not_reviewed" | "ready") {
  const now = new Date().toISOString();
  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError(
      (await supabase.from("submissions").update({ print_review_status: status, updated_at: now }).eq("id", submissionId)).error,
      "Unable to update print review status",
    );
    const result = await getSubmission(submissionId);
    if (result) {
      await syncSubmissionRegistryLinks({
        submissionId,
        siteId: result.row.site_id,
        printData: JSON.parse(result.row.print_data) as UHSF1601PrintData,
        reviewStatus: status,
        actor: "Admin Records",
      });
    }
    return;
  }

  getDb()
    .prepare("UPDATE submissions SET print_review_status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, submissionId);

  const result = await getSubmission(submissionId);
  if (result) {
    await syncSubmissionRegistryLinks({
      submissionId,
      siteId: result.row.site_id,
      printData: JSON.parse(result.row.print_data) as UHSF1601PrintData,
      reviewStatus: status,
      actor: "Admin Records",
    });
  }
}

export async function setPinned(submissionId: string, pinned: boolean) {
  const now = new Date().toISOString();
  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError(
      (await supabase.from("submissions").update({ pinned: pinned ? 1 : 0, updated_at: now }).eq("id", submissionId)).error,
      "Unable to update pinned status",
    );
    return;
  }

  getDb()
    .prepare("UPDATE submissions SET pinned = ?, updated_at = ? WHERE id = ?")
    .run(pinned ? 1 : 0, now, submissionId);
}

export async function deleteSubmission(submissionId: string) {
  const result = await getSubmission(submissionId);
  if (!result) return false;

  const paths = result.evidence
    .map((document) => document.storage_path)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

  if (shouldUseSupabaseSubmissionsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError((await supabase.from("submissions").delete().eq("id", submissionId)).error, "Unable to delete submission");
    await getSubmissionStorageProvider().deleteObjects?.({ keys: paths.filter(isSupabaseStorageKey) });
    return true;
  }

  const run = getDb().transaction(() => {
    getDb().prepare("DELETE FROM evidence_documents WHERE submission_id = ?").run(submissionId);
    getDb().prepare("DELETE FROM submissions WHERE id = ?").run(submissionId);
  });

  run();

  paths.forEach((storagePath) => {
    fs.rmSync(path.dirname(storagePath), { recursive: true, force: true });
  });

  return true;
}
