import { NextResponse } from "next/server";
import { createAdminSession, UnauthorizedError } from "@/lib/auth/admin";

export const runtime = "nodejs";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" && value.startsWith("/admin") ? value : "/admin";
  return next === "/admin/login" ? "/admin" : next;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = typeof formData.get("username") === "string" ? String(formData.get("username")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const next = safeNext(formData.get("next"));

  try {
    await createAdminSession(username, password);
    return NextResponse.redirect(new URL(next, request.url), { status: 303 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("error", "1");
      url.searchParams.set("next", next);
      return NextResponse.redirect(url, { status: 303 });
    }
    throw error;
  }
}
