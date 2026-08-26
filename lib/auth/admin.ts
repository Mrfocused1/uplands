export interface AdminSession {
  id: number;
  username: string;
  displayName: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * The admin area is intentionally open (no login). These helpers remain so the
 * existing route guards and layout stay intact as no-ops.
 */
const PUBLIC_ADMIN: AdminSession = { id: 0, username: "Admin", displayName: "Admin" };

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  return PUBLIC_ADMIN;
}

export async function requireAdmin(): Promise<AdminSession> {
  return PUBLIC_ADMIN;
}
