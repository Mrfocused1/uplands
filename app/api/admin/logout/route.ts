import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await destroyAdminSession();
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}
