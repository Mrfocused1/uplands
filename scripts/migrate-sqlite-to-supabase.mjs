import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = ".env.local";
const DB_FILE = process.env.SQLITE_DB_PATH || "data/uplands.db";

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function safeObjectName(value) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, "").trim().replace(/\s+/g, "-") || "document";
}

async function upsertRows(supabase, table, rows, onConflict = "id") {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`Failed to upsert ${table}: ${error.message}`);
}

async function uploadEvidenceFiles(supabase, bucket, evidenceRows) {
  const migrated = [];
  let uploaded = 0;
  let missing = 0;

  for (const row of evidenceRows) {
    if (!row.storage_path || !path.isAbsolute(row.storage_path)) {
      migrated.push(row);
      continue;
    }

    if (!fs.existsSync(row.storage_path)) {
      migrated.push({ ...row, storage_path: null });
      missing += 1;
      continue;
    }

    const fileName = safeObjectName(row.original_name || path.basename(row.storage_path));
    const key = `submissions/${row.submission_id}/${row.id}-${fileName}`;
    const buffer = fs.readFileSync(row.storage_path);
    const { error } = await supabase.storage.from(bucket).upload(key, buffer, {
      contentType: row.mime_type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(`Failed to upload ${row.storage_path}: ${error.message}`);

    migrated.push({ ...row, storage_path: key });
    uploaded += 1;
  }

  return { rows: migrated, uploaded, missing };
}

async function main() {
  const env = { ...readEnvFile(ENV_FILE), ...process.env };
  const url = required(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required(env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const uploadsBucket = env.SUPABASE_UPLOADS_BUCKET || "uplands-uploads";

  if (!fs.existsSync(DB_FILE)) throw new Error(`SQLite database not found: ${DB_FILE}`);

  const db = new Database(DB_FILE, { readonly: true });
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const submissions = db.prepare("select * from submissions order by created_at").all();
  const evidence = db.prepare("select * from evidence_documents order by submission_id, document_type").all();
  const uploadedEvidence = await uploadEvidenceFiles(supabase, uploadsBucket, evidence);

  await upsertRows(supabase, "submissions", submissions);
  await upsertRows(supabase, "evidence_documents", uploadedEvidence.rows);

  const ramsDocuments = db.prepare("select * from rams_documents order by created_at").all();
  const ramsSections = db.prepare("select * from rams_sections order by sort_order").all();
  const ramsChunks = db.prepare("select * from rams_chunks order by chunk_index").all();
  const ramsChunkBoxes = db.prepare("select * from rams_chunk_boxes order by chunk_id, sort_order").all();
  const ramsChatThreads = db.prepare("select * from rams_chat_threads order by created_at").all();
  const ramsChatMessages = db.prepare("select * from rams_chat_messages order by created_at").all();
  const ramsChatCitations = db.prepare("select * from rams_chat_citations order by citation_order").all();
  const ramsReviewEvidence = db.prepare("select * from rams_review_evidence order by created_at").all();

  await upsertRows(supabase, "rams_documents", ramsDocuments);
  await upsertRows(supabase, "rams_sections", ramsSections);
  await upsertRows(supabase, "rams_chunks", ramsChunks);
  await upsertRows(supabase, "rams_chunk_boxes", ramsChunkBoxes);
  await upsertRows(supabase, "rams_chat_threads", ramsChatThreads);
  await upsertRows(supabase, "rams_chat_messages", ramsChatMessages);
  await upsertRows(supabase, "rams_chat_citations", ramsChatCitations);
  await upsertRows(supabase, "rams_review_evidence", ramsReviewEvidence, "rams_document_id,review_question_key,chunk_id");

  console.log(
    JSON.stringify(
      {
        submissions: submissions.length,
        evidenceDocuments: evidence.length,
        evidenceFilesUploaded: uploadedEvidence.uploaded,
        evidenceFilesMissing: uploadedEvidence.missing,
        ramsDocuments: ramsDocuments.length,
        ramsSections: ramsSections.length,
        ramsChunks: ramsChunks.length,
        ramsChunkBoxes: ramsChunkBoxes.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
