import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string) {
  return scryptSync(password, salt, 64) as Buffer;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = derive(password, salt).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = derive(password, salt);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
