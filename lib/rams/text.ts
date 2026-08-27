export function normaliseText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenCount(text: string) {
  return normaliseText(text).split(/\s+/).filter(Boolean).length;
}

export function snippetFor(text: string, query: string, maxLength = 240) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const terms = normaliseText(query).split(/\s+/).filter(Boolean);
  const lower = clean.toLowerCase();
  const firstMatch = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstMatch - Math.floor(maxLength / 3));
  const end = Math.min(clean.length, start + maxLength);
  return `${start > 0 ? "..." : ""}${clean.slice(start, end).trim()}${end < clean.length ? "..." : ""}`;
}
