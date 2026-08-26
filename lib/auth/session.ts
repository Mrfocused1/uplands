import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "uplands_admin_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface AdminSession {
  id: number;
  username: string;
  displayName: string;
}

export function createSession(adminId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  getDb()
    .prepare("INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)")
    .run(token, adminId, expiresAt);

  return { token, expiresAt };
}

export function getSessionAdmin(token: string | undefined): AdminSession | null {
  if (!token) return null;

  const row = getDb()
    .prepare(
      `SELECT a.id, a.username, a.display_name, s.expires_at
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token = ?`,
    )
    .get(token) as { id: number; username: string; display_name: string | null; expires_at: string } | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return { id: row.id, username: row.username, displayName: row.display_name ?? row.username };
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
