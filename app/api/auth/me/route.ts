import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ admin: null });
  return NextResponse.json({ admin: { username: admin.username, displayName: admin.displayName } });
}
