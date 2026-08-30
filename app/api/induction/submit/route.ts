import { NextResponse } from "next/server";
import { getSubmission, persistSubmission } from "@/lib/db/submissions";
import { getPublicInductionInvitation, markInductionInvitationSubmitted } from "@/lib/db/inductionInvitations";
import { assertPublicPayloadSize, validateUHSF1601PrintData, ValidationError } from "@/lib/induction/validatePrintData";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await rateLimit(request, { scope: "induction-submit", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let data;
  let inviteToken: string | null = null;
  let invitation: Awaited<ReturnType<typeof getPublicInductionInvitation>> = null;
  try {
    assertPublicPayloadSize(request);
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    inviteToken = typeof raw?.inviteToken === "string" ? raw.inviteToken.trim() || null : null;
    if (inviteToken) {
      invitation = await getPublicInductionInvitation(inviteToken);
      if (!invitation) return NextResponse.json({ error: "This induction invite is no longer available." }, { status: 410 });
    }
    data = validateUHSF1601PrintData(raw);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  if (invitation) {
    data = {
      ...data,
      siteName: invitation.siteName,
      companyName: invitation.contractorName,
    };
  }

  const { id, reference } = await persistSubmission(data);
  if (inviteToken) {
    const saved = await getSubmission(id);
    await markInductionInvitationSubmitted(inviteToken, id, saved?.row.operative_id ?? null);
  }
  return NextResponse.json({ id, reference }, { status: 201 });
}
