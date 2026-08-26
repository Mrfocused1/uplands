import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Enter a username and password." }, { status: 400 });
  }

  const admin = getDb()
    .prepare("SELECT id, username, password_hash FROM admins WHERE username = ?")
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const { token, expiresAt } = createSession(admin.id);
  const response = NextResponse.json({ ok: true, username: admin.username });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return response;
}
