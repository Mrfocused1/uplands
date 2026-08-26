import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getDb, UPLOADS_DIR } from "@/lib/db";
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
  full_name: string | null;
  company_name: string | null;
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

export function persistSubmission(printData: UHSF1601PrintData): { id: string; reference: string } {
  const id = randomUUID();
  const reference = `UHSF-${id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const subDir = path.join(UPLOADS_DIR, id);
  fs.mkdirSync(subDir, { recursive: true });

  const insertSubmission = getDb().prepare(
    `INSERT INTO submissions
       (id, reference, full_name, company_name, site_name, declaration_date, print_review_status, print_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'not_reviewed', ?, ?, ?)`,
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
      printData.fullName ?? null,
      printData.companyName ?? null,
      printData.siteName ?? null,
      printData.declarationDate ?? null,
      JSON.stringify({ ...printData, uploadedDocuments: [] }),
      now,
      now,
    );

    for (const doc of printData.uploadedDocuments ?? []) {
      const comma = (doc.dataUrl ?? "").indexOf(",");
      if (comma === -1) continue;

      const mime = mimeFromDataUrl(doc.dataUrl ?? "");
      const ext = EXT_BY_MIME[mime] ?? "bin";
      const filePath = path.join(subDir, `${doc.id}.${ext}`);
      fs.writeFileSync(filePath, Buffer.from(doc.dataUrl!.slice(comma + 1), "base64"));

      insertEvidence.run(randomUUID(), id, doc.id, doc.label, mime, filePath, now);
    }
  });

  run();
  return { id, reference };
}

export function listSubmissions() {
  return getDb()
    .prepare(
      `SELECT s.id, s.reference, s.full_name, s.company_name, s.site_name, s.declaration_date,
              s.print_review_status, s.print_data, s.pinned, s.is_sample, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM evidence_documents e WHERE e.submission_id = s.id AND e.storage_path IS NOT NULL) AS evidence_count
       FROM submissions s
       ORDER BY s.pinned DESC, s.created_at DESC`,
    )
    .all() as Array<SubmissionRow & { evidence_count: number }>;
}

export function getSubmission(id: string) {
  const row = getDb().prepare("SELECT * FROM submissions WHERE id = ?").get(id) as SubmissionRow | undefined;
  if (!row) return null;

  const evidence = getDb()
    .prepare("SELECT * FROM evidence_documents WHERE submission_id = ? ORDER BY document_type")
    .all(id) as EvidenceDocRow[];

  return { row, evidence };
}

export function saveEvidenceTransforms(
  submissionId: string,
  transforms: Partial<Record<EvidenceType, EvidencePrintTransform>>,
  updatedBy: string,
) {
  const now = new Date().toISOString();
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

export function setPrintReviewStatus(submissionId: string, status: "not_reviewed" | "ready") {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE submissions SET print_review_status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, submissionId);
}

export function setPinned(submissionId: string, pinned: boolean) {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE submissions SET pinned = ?, updated_at = ? WHERE id = ?")
    .run(pinned ? 1 : 0, now, submissionId);
}

export function deleteSubmission(submissionId: string) {
  const result = getSubmission(submissionId);
  if (!result) return false;

  const paths = result.evidence
    .map((document) => document.storage_path)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

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
