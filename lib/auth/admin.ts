import { cookies } from "next/headers";
import { getSessionAdmin, SESSION_COOKIE, type AdminSession } from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  const store = await cookies();
  return getSessionAdmin(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}
