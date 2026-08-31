import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "uplands_admin_session";
const SIGNED_COOKIE_PREFIX = "v1";
const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/wp-content/uploads/2018/08/uplands-construction-logo.svg"]);

function hasSupabaseAuthConfig() {
  return (
    process.env.ADMIN_AUTH_PROVIDER === "supabase" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

function boolEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function siteLockRequired() {
  return boolEnv("SITE_LOCK_REQUIRED", process.env.NODE_ENV === "production");
}

function base64UrlToBase64(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return padded.replaceAll("-", "+").replaceAll("_", "/");
}

function base64Url(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signPayload(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function hasValidSiteSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token || !token.startsWith(`${SIGNED_COOKIE_PREFIX}.`)) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const [, payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if ((await signPayload(payload, secret)) !== signature) return false;

  try {
    const parsed = JSON.parse(atob(base64UrlToBase64(payload))) as { exp?: number };
    return Boolean(parsed.exp && parsed.exp >= Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

function isPublicRequest(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  if (siteLockRequired() && !isPublicRequest(request.nextUrl.pathname) && !(await hasValidSiteSession(request))) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectToLogin(request);
  }

  if (!hasSupabaseAuthConfig()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
