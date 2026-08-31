export function safeLoginNext(value: unknown) {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/admin";
  if (next === "/") return "/admin";
  if (next === "/admin/login" || next.startsWith("/api/")) return "/admin";
  return next;
}
