import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { boolEnv, env, isSupabaseConfigured } from "@/lib/env";
import { adminAuthRequiredForEnvironment } from "@/lib/auth/adminMode";
import { verifyPassword } from "@/lib/auth/password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminSession {
  id: number | string;
  username: string;
  displayName: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

const ADMIN_COOKIE = "uplands_admin_session";
const SESSION_DAYS = 8;
const PUBLIC_ADMIN: AdminSession = { id: 0, username: "Admin", displayName: "Admin" };
const SIGNED_COOKIE_PREFIX = "v1";
const SITE_LOCK_USERNAME = "Paul";
const SITE_LOCK_PASSWORD = "4321";

function authRequired() {
  if (boolEnv("SITE_LOCK_REQUIRED", process.env.NODE_ENV === "production")) return true;
  return adminAuthRequiredForEnvironment(process.env.NODE_ENV, boolEnv("ADMIN_AUTH_REQUIRED", false), boolEnv("PUBLIC_TESTING_MODE", false));
}

function shouldUseSupabaseAuth() {
  return env("ADMIN_AUTH_PROVIDER", "local") === "supabase" && isSupabaseConfigured();
}

function allowedAdminEmails() {
  return env("SUPABASE_ADMIN_EMAILS")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function emailIsAllowed(email: string | undefined | null) {
  const allowed = allowedAdminEmails();
  if (allowed.length === 0) return false;
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

function expiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt(),
  };
}

function rowToSession(row: { id: number; username: string; display_name: string | null }): AdminSession {
  return { id: row.id, username: row.username, displayName: row.display_name || row.username };
}

function sessionSecret() {
  return env("ADMIN_SESSION_SECRET");
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSignedSessionCookie(session: AdminSession) {
  const secret = sessionSecret();
  if (!secret) return null;

  const payload = base64Url(
    JSON.stringify({
      id: session.id,
      username: session.username,
      displayName: session.displayName,
      exp: Math.floor(expiresAt().getTime() / 1000),
    }),
  );
  return `${SIGNED_COOKIE_PREFIX}.${payload}.${signPayload(payload, secret)}`;
}

function verifySignedSessionCookie(value: string): AdminSession | null {
  const secret = sessionSecret();
  if (!secret || !value.startsWith(`${SIGNED_COOKIE_PREFIX}.`)) return null;

  const [, payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;

  let parsed: {
    id?: number | string;
    username?: string;
    displayName?: string;
    exp?: number;
  };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof parsed;
  } catch {
    return null;
  }
  if (!parsed.username || !parsed.displayName || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return { id: parsed.id ?? parsed.username, username: parsed.username, displayName: parsed.displayName };
}

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  if (!authRequired()) return PUBLIC_ADMIN;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (token) {
    const signedSession = verifySignedSessionCookie(token);
    if (signedSession) return signedSession;
  }

  if (shouldUseSupabaseAuth()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !emailIsAllowed(data.user.email)) return null;
    return {
      id: data.user.id,
      username: data.user.email || "supabase-admin",
      displayName: data.user.user_metadata?.full_name || data.user.email || "Admin",
    };
  }

  if (!token) return null;

  const row = getDb()
    .prepare(
      `SELECT admins.id, admins.username, admins.display_name
       FROM sessions
       JOIN admins ON admins.id = sessions.admin_id
       WHERE sessions.token = ? AND sessions.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as { id: number; username: string; display_name: string | null } | undefined;

  return row ? rowToSession(row) : null;
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

export async function createAdminSession(username: string, password: string): Promise<AdminSession> {
  if (username === SITE_LOCK_USERNAME && password === SITE_LOCK_PASSWORD) {
    const session = { id: "site-lock-paul", username: SITE_LOCK_USERNAME, displayName: SITE_LOCK_USERNAME };
    const signedCookie = createSignedSessionCookie(session);
    if (signedCookie) {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE, signedCookie, sessionCookieOptions());
      return session;
    }
  }

  if (shouldUseSupabaseAuth()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: username, password });
    if (error || !data.user || !emailIsAllowed(data.user.email)) {
      await supabase.auth.signOut();
      throw new UnauthorizedError();
    }
    return {
      id: data.user.id,
      username: data.user.email || username,
      displayName: data.user.user_metadata?.full_name || data.user.email || username,
    };
  }

  const row = getDb()
    .prepare("SELECT id, username, password_hash, display_name FROM admins WHERE username = ?")
    .get(username) as { id: number; username: string; password_hash: string; display_name: string | null } | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new UnauthorizedError();
  }

  const session = rowToSession(row);
  const signedCookie = createSignedSessionCookie(session);
  if (signedCookie) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, signedCookie, sessionCookieOptions());
    return session;
  }

  const token = randomBytes(32).toString("hex");
  const expires = expiresAt();
  getDb().prepare("INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)").run(token, row.id, expires.toISOString());
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, sessionCookieOptions());

  return session;
}

export async function destroyAdminSession() {
  if (shouldUseSupabaseAuth()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  cookieStore.set(ADMIN_COOKIE, "", { path: "/", expires: new Date(0) });
}
