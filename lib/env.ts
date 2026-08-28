function value(name: string) {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : "";
}

export function env(name: string, fallback = "") {
  return value(name) || fallback;
}

export function boolEnv(name: string, fallback: boolean) {
  const raw = value(name).toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isSupabaseConfigured() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
}

export function isSupabaseAdminConfigured() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
}
