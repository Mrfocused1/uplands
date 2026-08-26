import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashPassword } from "@/lib/auth/password";
import { seedSampleSubmissions } from "@/lib/db/sampleSubmissions";

const DATA_DIR =
  process.env.UPLANDS_DATA_DIR ?? (process.env.VERCEL ? path.join(os.tmpdir(), "uplands") : path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
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

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      reference TEXT,
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
  `);

  ensureColumn(db, "submissions", "pinned", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "submissions", "is_sample", "INTEGER NOT NULL DEFAULT 0");
}

function seedAdmin(db: Db) {
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

export function getDb(): Db {
  if (!globalForDb.__uplandsDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    migrate(db);
    seedAdmin(db);
    seedSampleSubmissions(db, UPLOADS_DIR);

    globalForDb.__uplandsDb = db;
  }

  return globalForDb.__uplandsDb;
}
