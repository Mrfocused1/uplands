import { NextResponse } from "next/server";
import { persistSubmission } from "@/lib/db/submissions";
import { assertPublicPayloadSize, validateUHSF1601PrintData, ValidationError } from "@/lib/induction/validatePrintData";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await rateLimit(request, { scope: "induction-submit", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let data;
  try {
    assertPublicPayloadSize(request);
    data = validateUHSF1601PrintData(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const { id, reference } = await persistSubmission(data);
  return NextResponse.json({ id, reference }, { status: 201 });
}
