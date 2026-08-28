import { NextResponse } from "next/server";
import { persistSubmission } from "@/lib/db/submissions";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = (await request.json().catch(() => null)) as UHSF1601PrintData | null;

  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "A completed induction is required to submit." }, { status: 400 });
  }

  const { id, reference } = await persistSubmission(data);
  return NextResponse.json({ id, reference }, { status: 201 });
}
