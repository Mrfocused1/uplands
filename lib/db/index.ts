import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashPassword } from "@/lib/auth/password";
import { PERMIT_TEMPLATES } from "@/config/permitTemplates";
import { DEFAULT_SITE_SEEDS } from "@/config/siteSeeds";
import { seedSampleSubmissions } from "@/lib/db/sampleSubmissions";

export const DATA_DIR =
  process.env.UPLANDS_DATA_DIR ?? (process.env.VERCEL ? path.join(os.tmpdir(), "uplands") : path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const RAMS_STORAGE_DIR = path.join(DATA_DIR, "rams-documents");
const DB_PATH = path.join(DATA_DIR, "uplands.db");

type Db = Database.Database;

const globalForDb = globalThis as unknown as { __uplandsDb?: Db };

function ensureColumn(db: Db, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_memberships (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      admin_id TEXT NOT NULL,
      role TEXT NOT NULL,
      can_manage_inductions INTEGER NOT NULL DEFAULT 1,
      can_manage_rams INTEGER NOT NULL DEFAULT 1,
      can_manage_permits INTEGER NOT NULL DEFAULT 1,
      can_manage_attendance INTEGER NOT NULL DEFAULT 0,
      can_manage_handover INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(site_id, admin_id, role)
    );

    CREATE TABLE IF NOT EXISTS site_activity_events (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      actor TEXT,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      primary_contact_name TEXT,
      primary_contact_email TEXT,
      primary_contact_phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_contractors (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      trade TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(site_id, contractor_id)
    );

    CREATE TABLE IF NOT EXISTS operatives (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      cscs_card_number TEXT,
      cscs_expiry TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_operatives (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      operative_id TEXT NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
      induction_submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
      induction_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(site_id, operative_id)
    );

    CREATE TABLE IF NOT EXISTS induction_invitations (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      operative_id TEXT REFERENCES operatives(id) ON DELETE SET NULL,
      submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
      invited_full_name TEXT,
      invited_email TEXT,
      invited_phone TEXT,
      role TEXT,
      status TEXT NOT NULL DEFAULT 'INVITED',
      expires_at TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      used_at TEXT,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      operative_id TEXT NOT NULL REFERENCES operatives(id) ON DELETE CASCADE,
      induction_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      shift TEXT NOT NULL DEFAULT 'DAY',
      status TEXT NOT NULL DEFAULT 'SIGNED_IN',
      signed_in_at TEXT NOT NULL DEFAULT (datetime('now')),
      signed_in_by TEXT,
      signed_out_at TEXT,
      signed_out_by TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_handovers (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      handover_date TEXT NOT NULL,
      shift TEXT NOT NULL DEFAULT 'DAY',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      manager_name TEXT,
      summary TEXT,
      work_completed TEXT,
      contractors_present TEXT,
      permits_summary TEXT,
      issues TEXT,
      deliveries TEXT,
      outstanding_actions TEXT,
      next_shift_notes TEXT,
      submitted_at TEXT,
      submitted_by TEXT,
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permit_templates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      register_code TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permit_template_sections (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES permit_templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permit_template_questions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES permit_templates(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES permit_template_sections(id) ON DELETE CASCADE,
      question_key TEXT NOT NULL,
      prompt TEXT NOT NULL,
      help_text TEXT,
      answer_type TEXT NOT NULL DEFAULT 'YES_NO_NA',
      requires_comment_on TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(template_id, question_key)
    );

    CREATE TABLE IF NOT EXISTS permit_template_fields (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES permit_templates(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      label TEXT NOT NULL,
      help_text TEXT,
      field_type TEXT NOT NULL,
      required INTEGER NOT NULL DEFAULT 0,
      options_json TEXT,
      placeholder TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(template_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS permits (
      id TEXT PRIMARY KEY,
      permit_number TEXT NOT NULL UNIQUE,
      template_id TEXT NOT NULL REFERENCES permit_templates(id),
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      contractor_id TEXT REFERENCES contractors(id) ON DELETE SET NULL,
      rams_document_id TEXT REFERENCES rams_documents(id) ON DELETE SET NULL,
      contractor TEXT NOT NULL,
      location_of_work TEXT NOT NULL,
      description_of_work TEXT NOT NULL,
      valid_from_date TEXT NOT NULL,
      valid_to_date TEXT NOT NULL,
      valid_from_time TEXT NOT NULL,
      valid_to_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permit_answers (
      id TEXT PRIMARY KEY,
      permit_id TEXT NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
      question_key TEXT NOT NULL,
      answer TEXT NOT NULL,
      comment TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(permit_id, question_key)
    );

    CREATE TABLE IF NOT EXISTS permit_field_values (
      id TEXT PRIMARY KEY,
      permit_id TEXT NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(permit_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS permit_signatures (
      id TEXT PRIMARY KEY,
      permit_id TEXT NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
      signature_key TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      position TEXT,
      signed_at TEXT NOT NULL,
      signature_data_url TEXT,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(permit_id, signature_key)
    );

    CREATE INDEX IF NOT EXISTS idx_permits_site ON permits(site_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contractors_name ON contractors(name);
    CREATE INDEX IF NOT EXISTS idx_site_contractors_site ON site_contractors(site_id, status);
    CREATE INDEX IF NOT EXISTS idx_site_contractors_contractor ON site_contractors(contractor_id);
    CREATE INDEX IF NOT EXISTS idx_operatives_contractor ON operatives(contractor_id, status);
    CREATE INDEX IF NOT EXISTS idx_site_operatives_site ON site_operatives(site_id, status);
    CREATE INDEX IF NOT EXISTS idx_site_operatives_contractor ON site_operatives(site_id, contractor_id, status);
    CREATE INDEX IF NOT EXISTS idx_site_operatives_operative ON site_operatives(operative_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_site_status ON attendance_records(site_id, status, signed_in_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_contractor ON attendance_records(site_id, contractor_id, signed_in_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_operative ON attendance_records(site_id, operative_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_one_open_record ON attendance_records(site_id, operative_id) WHERE status = 'SIGNED_IN';
    CREATE INDEX IF NOT EXISTS idx_site_handovers_site_date ON site_handovers(site_id, handover_date DESC, shift);
    CREATE INDEX IF NOT EXISTS idx_site_handovers_status ON site_handovers(site_id, status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_induction_invitations_site ON induction_invitations(site_id, contractor_id, status);
    CREATE INDEX IF NOT EXISTS idx_induction_invitations_submission ON induction_invitations(submission_id);
    CREATE INDEX IF NOT EXISTS idx_induction_invitations_expires ON induction_invitations(expires_at);
    CREATE INDEX IF NOT EXISTS idx_permit_template_fields_template ON permit_template_fields(template_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_permit_answers_permit ON permit_answers(permit_id);
    CREATE INDEX IF NOT EXISTS idx_permit_field_values_permit ON permit_field_values(permit_id);
    CREATE INDEX IF NOT EXISTS idx_permit_signatures_permit ON permit_signatures(permit_id);
    CREATE INDEX IF NOT EXISTS idx_site_activity_site ON site_activity_events(site_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_site_activity_entity ON site_activity_events(entity_type, entity_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      reference TEXT,
      site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
      full_name TEXT,
      company_name TEXT,
      site_name TEXT,
      declaration_date TEXT,
      print_review_status TEXT NOT NULL DEFAULT 'not_reviewed',
      print_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence_documents (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      storage_path TEXT,
      source_width INTEGER,
      source_height INTEGER,
      fit_mode TEXT NOT NULL DEFAULT 'fit',
      offset_x REAL NOT NULL DEFAULT 0,
      offset_y REAL NOT NULL DEFAULT 0,
      scale REAL NOT NULL DEFAULT 1,
      rotation INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_evidence_submission ON evidence_documents(submission_id);

    CREATE TABLE IF NOT EXISTS rams_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
      site_name TEXT,
      contractor_id TEXT REFERENCES contractors(id) ON DELETE SET NULL,
      contractor TEXT NOT NULL,
      document_reference TEXT,
      revision TEXT,
      revision_date TEXT,
      file_name TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      page_count INTEGER,
      processing_status TEXT NOT NULL DEFAULT 'UPLOADED',
      processing_error TEXT,
      text_extraction_status TEXT NOT NULL DEFAULT 'PENDING',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_sections (
      id TEXT PRIMARY KEY,
      rams_document_id TEXT NOT NULL REFERENCES rams_documents(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_page INTEGER NOT NULL,
      end_page INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_chunks (
      id TEXT PRIMARY KEY,
      rams_document_id TEXT NOT NULL REFERENCES rams_documents(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES rams_sections(id) ON DELETE SET NULL,
      page_number INTEGER NOT NULL,
      end_page_number INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      normalised_text TEXT NOT NULL,
      embedding TEXT,
      token_count INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_chunk_boxes (
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL REFERENCES rams_chunks(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      page_width REAL,
      page_height REAL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rams_chat_threads (
      id TEXT PRIMARY KEY,
      rams_document_id TEXT NOT NULL REFERENCES rams_documents(id) ON DELETE CASCADE,
      admin_id TEXT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES rams_chat_threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_chat_citations (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES rams_chat_messages(id) ON DELETE CASCADE,
      chunk_id TEXT NOT NULL REFERENCES rams_chunks(id) ON DELETE CASCADE,
      citation_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rams_review_evidence (
      id TEXT PRIMARY KEY,
      rams_document_id TEXT NOT NULL REFERENCES rams_documents(id) ON DELETE CASCADE,
      review_question_key TEXT NOT NULL,
      answer TEXT NOT NULL,
      comment TEXT,
      chunk_id TEXT REFERENCES rams_chunks(id) ON DELETE SET NULL,
      confidence REAL,
      decision_origin TEXT NOT NULL DEFAULT 'MANUAL',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rams_document_id, review_question_key, chunk_id)
    );

    CREATE INDEX IF NOT EXISTS idx_rams_documents_created ON rams_documents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rams_documents_status ON rams_documents(processing_status);
    CREATE INDEX IF NOT EXISTS idx_rams_sections_document ON rams_sections(rams_document_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_rams_chunks_document ON rams_chunks(rams_document_id, chunk_index);
    CREATE INDEX IF NOT EXISTS idx_rams_chunks_document_page ON rams_chunks(rams_document_id, page_number);
    CREATE INDEX IF NOT EXISTS idx_rams_chunk_boxes_chunk ON rams_chunk_boxes(chunk_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_rams_review_evidence_document ON rams_review_evidence(rams_document_id, review_question_key);
  `);

  ensureColumn(db, "submissions", "site_id", "TEXT REFERENCES sites(id) ON DELETE SET NULL");
  ensureColumn(db, "submissions", "pinned", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "submissions", "is_sample", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "rams_documents", "site_id", "TEXT REFERENCES sites(id) ON DELETE SET NULL");
  ensureColumn(db, "rams_documents", "contractor_id", "TEXT REFERENCES contractors(id) ON DELETE SET NULL");
  ensureColumn(db, "permits", "contractor_id", "TEXT REFERENCES contractors(id) ON DELETE SET NULL");
  ensureColumn(db, "permits", "rams_document_id", "TEXT REFERENCES rams_documents(id) ON DELETE SET NULL");
  ensureColumn(db, "submissions", "contractor_id", "TEXT REFERENCES contractors(id) ON DELETE SET NULL");
  ensureColumn(db, "submissions", "operative_id", "TEXT REFERENCES operatives(id) ON DELETE SET NULL");
  ensureColumn(db, "rams_chunk_boxes", "page_width", "REAL");
  ensureColumn(db, "rams_chunk_boxes", "page_height", "REAL");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_submissions_site ON submissions(site_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rams_documents_site ON rams_documents(site_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rams_documents_contractor ON rams_documents(site_id, contractor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_permits_rams_document ON permits(rams_document_id);
  `);
}

function seedAdmin(db: Db) {
  const production = process.env.NODE_ENV === "production";
  const localAdminAuth = (process.env.ADMIN_AUTH_PROVIDER ?? "local") === "local";
  if (production && localAdminAuth && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET)) {
    throw new Error("Production local admin auth requires ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.");
  }

  const username = process.env.ADMIN_USERNAME || "Matty";
  const password = process.env.ADMIN_PASSWORD || "1234";

  const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
  if (existing) return;

  db.prepare("INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)").run(
    username,
    hashPassword(password),
    username,
  );
}

function seedPermitTemplates(db: Db) {
  const now = new Date().toISOString();
  const insertTemplate = db.prepare(
    `INSERT INTO permit_templates (id, code, title, description, register_code, version, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       code = excluded.code,
       title = excluded.title,
       description = excluded.description,
       register_code = excluded.register_code,
       version = excluded.version,
       status = excluded.status,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  );
  const insertSection = db.prepare(
    `INSERT INTO permit_template_sections (id, template_id, title, description, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       sort_order = excluded.sort_order`,
  );
  const insertQuestion = db.prepare(
    `INSERT INTO permit_template_questions
       (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'YES_NO_NA', ?, ?, ?)
     ON CONFLICT(template_id, question_key) DO UPDATE SET
       section_id = excluded.section_id,
       prompt = excluded.prompt,
       help_text = excluded.help_text,
       answer_type = excluded.answer_type,
       requires_comment_on = excluded.requires_comment_on,
       sort_order = excluded.sort_order`,
  );
  const insertField = db.prepare(
    `INSERT INTO permit_template_fields
       (id, template_id, field_key, label, help_text, field_type, required, options_json, placeholder, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(template_id, field_key) DO UPDATE SET
       label = excluded.label,
       help_text = excluded.help_text,
       field_type = excluded.field_type,
       required = excluded.required,
       options_json = excluded.options_json,
       placeholder = excluded.placeholder,
       sort_order = excluded.sort_order`,
  );
  const deleteFields = db.prepare("DELETE FROM permit_template_fields WHERE template_id = ?");
  const deleteQuestions = db.prepare("DELETE FROM permit_template_questions WHERE template_id = ?");
  const deleteSections = db.prepare("DELETE FROM permit_template_sections WHERE template_id = ?");

  const run = db.transaction(() => {
    for (const template of PERMIT_TEMPLATES) {
      insertTemplate.run(template.id, template.code, template.title, template.description, template.registerCode, template.version, template.sortOrder, now, now);
      deleteFields.run(template.id);
      deleteQuestions.run(template.id);
      deleteSections.run(template.id);
      for (const field of template.fields ?? []) {
        insertField.run(
          `${template.id}:${field.key}`,
          template.id,
          field.key,
          field.label,
          field.helpText ?? null,
          field.type,
          field.required ? 1 : 0,
          field.options ? JSON.stringify(field.options) : null,
          field.placeholder ?? null,
          field.sortOrder,
          now,
        );
      }
      for (const section of template.sections) {
        const sectionId = `${template.id}:${section.id}`;
        insertSection.run(sectionId, template.id, section.title, section.description ?? null, section.sortOrder, now);
        section.questions.forEach((question, index) => {
          insertQuestion.run(
            `${template.id}:${question.key}`,
            template.id,
            sectionId,
            question.key,
            question.prompt,
            question.helpText ?? null,
            question.requiresCommentOn?.join(",") ?? "NO",
            index + 1,
            now,
          );
        });
      }
    }
  });

  run();
}

function seedSites(db: Db) {
  const now = new Date().toISOString();
  const insertSite = db.prepare(
    `INSERT INTO sites (id, name, location, summary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       location = excluded.location,
       summary = excluded.summary,
       status = excluded.status,
       updated_at = excluded.updated_at`,
  );
  const insertProject = db.prepare(
    `INSERT INTO projects (id, site_id, name, reference, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       site_id = excluded.site_id,
       name = excluded.name,
       reference = excluded.reference,
       status = excluded.status,
       updated_at = excluded.updated_at`,
  );

  const run = db.transaction(() => {
    for (const site of DEFAULT_SITE_SEEDS) {
      insertSite.run(site.id, site.name, site.location, site.summary, site.status, now, now);
      insertProject.run(site.project.id, site.id, site.project.name, site.project.reference, now, now);

      const exactTerms = [site.id, site.name.toLowerCase(), site.location.toLowerCase(), site.project.name.toLowerCase()];
      const fuzzyTerms = exactTerms.map((term) => `%${term}%`);

      db.prepare(
        `UPDATE submissions
         SET site_id = ?
         WHERE site_id IS NULL
           AND lower(COALESCE(site_name, '')) IN (?, ?, ?, ?)`,
      ).run(site.id, ...exactTerms);
      db.prepare(
        `UPDATE submissions
         SET site_id = ?
         WHERE site_id IS NULL
           AND (
             lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
           )`,
      ).run(site.id, ...fuzzyTerms);
      db.prepare(
        `UPDATE rams_documents
         SET site_id = ?
         WHERE site_id IS NULL
           AND (
             lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
             OR lower(COALESCE(site_name, '')) LIKE ?
           )`,
      ).run(site.id, ...fuzzyTerms);
    }
  });

  run();
}

function seedContractorsFromExistingRecords(db: Db) {
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT site_id, project_id, contractor AS name FROM permits WHERE trim(COALESCE(contractor, '')) <> ''
       UNION
       SELECT site_id, NULL AS project_id, contractor AS name FROM rams_documents WHERE trim(COALESCE(contractor, '')) <> ''
       UNION
       SELECT site_id, NULL AS project_id, company_name AS name FROM submissions WHERE trim(COALESCE(company_name, '')) <> ''`,
    )
    .all() as Array<{ site_id: string | null; project_id: string | null; name: string }>;

  const findContractor = db.prepare("SELECT id, name FROM contractors WHERE name = ?");
  const insertContractor = db.prepare("INSERT INTO contractors (id, name, status, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, ?)");
  const insertSiteContractor = db.prepare(
    `INSERT INTO site_contractors (id, site_id, project_id, contractor_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
     ON CONFLICT(site_id, contractor_id) DO UPDATE SET
       project_id = COALESCE(excluded.project_id, site_contractors.project_id),
       status = 'ACTIVE',
       updated_at = excluded.updated_at`,
  );
  const updatePermits = db.prepare("UPDATE permits SET contractor_id = ? WHERE contractor_id IS NULL AND contractor = ?");
  const updateRams = db.prepare("UPDATE rams_documents SET contractor_id = ? WHERE contractor_id IS NULL AND contractor = ?");

  const run = db.transaction(() => {
    for (const row of rows) {
      const name = row.name.trim();
      if (!name) continue;

      let contractor = findContractor.get(name) as { id: string; name: string } | undefined;
      if (!contractor) {
        contractor = { id: randomUUID(), name };
        insertContractor.run(contractor.id, name, now, now);
      }

      if (row.site_id) {
        insertSiteContractor.run(randomUUID(), row.site_id, row.project_id, contractor.id, now, now);
      }
      updatePermits.run(contractor.id, name);
      updateRams.run(contractor.id, name);
    }
  });

  run();
}

function seedOperativesFromExistingSubmissions(db: Db) {
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT
         s.id AS submission_id,
         s.site_id,
         s.full_name,
         s.company_name,
         s.print_review_status,
         c.id AS contractor_id
       FROM submissions s
       JOIN contractors c ON c.name = trim(s.company_name)
       WHERE s.operative_id IS NULL
         AND trim(COALESCE(s.full_name, '')) <> ''
         AND trim(COALESCE(s.company_name, '')) <> ''`,
    )
    .all() as Array<{
    submission_id: string;
    site_id: string | null;
    full_name: string;
    company_name: string;
    print_review_status: string;
    contractor_id: string;
  }>;

  const findOperative = db.prepare(
    `SELECT id FROM operatives
     WHERE contractor_id = ?
       AND lower(full_name) = lower(?)
     ORDER BY created_at
     LIMIT 1`,
  );
  const insertOperative = db.prepare(
    `INSERT INTO operatives (id, contractor_id, full_name, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
  );
  const insertSiteOperative = db.prepare(
    `INSERT INTO site_operatives
       (id, site_id, project_id, contractor_id, operative_id, induction_submission_id, induction_status, status, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, 'ACTIVE', ?, ?)
     ON CONFLICT(site_id, operative_id) DO UPDATE SET
       induction_submission_id = COALESCE(site_operatives.induction_submission_id, excluded.induction_submission_id),
       induction_status = excluded.induction_status,
       updated_at = excluded.updated_at`,
  );
  const updateSubmission = db.prepare("UPDATE submissions SET contractor_id = ?, operative_id = ?, updated_at = ? WHERE id = ?");

  const run = db.transaction(() => {
    for (const row of rows) {
      const fullName = row.full_name.trim();
      if (!fullName) continue;

      let operative = findOperative.get(row.contractor_id, fullName) as { id: string } | undefined;
      if (!operative) {
        operative = { id: randomUUID() };
        insertOperative.run(operative.id, row.contractor_id, fullName, now, now);
      }

      if (row.site_id) {
        insertSiteOperative.run(
          randomUUID(),
          row.site_id,
          row.contractor_id,
          operative.id,
          row.submission_id,
          row.print_review_status === "ready" ? "APPROVED" : "PENDING_REVIEW",
          now,
          now,
        );
      }
      updateSubmission.run(row.contractor_id, operative.id, now, row.submission_id);
    }
  });

  run();
}

export function getDb(): Db {
  if (!globalForDb.__uplandsDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.mkdirSync(RAMS_STORAGE_DIR, { recursive: true });

    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    migrate(db);
    seedAdmin(db);
    seedSites(db);
    seedPermitTemplates(db);
    seedContractorsFromExistingRecords(db);
    seedOperativesFromExistingSubmissions(db);
    seedSampleSubmissions(db, UPLOADS_DIR);
    seedSites(db);
    seedPermitTemplates(db);
    seedContractorsFromExistingRecords(db);
    seedOperativesFromExistingSubmissions(db);

    globalForDb.__uplandsDb = db;
  }

  return globalForDb.__uplandsDb;
}
