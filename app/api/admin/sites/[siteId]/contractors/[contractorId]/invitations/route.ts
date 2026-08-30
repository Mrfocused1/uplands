import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { buildInductionInviteMailto, sendInductionInviteEmail } from "@/lib/email/inductionInvites";
import { recordSiteActivity } from "@/lib/db/activity";
import {
  createInductionInvitation,
  getPublicInductionInvitation,
  isInductionInvitationDatabaseSetupError,
  invitationUrl,
  listInductionInvitations,
  revokeInductionInvitation,
} from "@/lib/db/inductionInvitations";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function deliveryMode(value: unknown) {
  return text(value) === "email" ? "email" : "copy";
}

function serializeInvitation(row: Awaited<ReturnType<typeof listInductionInvitations>>[number]) {
  return {
    id: row.id,
    siteId: row.site_id,
    projectId: row.project_id,
    contractorId: row.contractor_id,
    operativeId: row.operative_id,
    submissionId: row.submission_id,
    invitedFullName: row.invited_full_name,
    invitedEmail: row.invited_email,
    invitedPhone: row.invited_phone,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  try {
    const invitations = await listInductionInvitations(siteId, contractorId);
    return NextResponse.json({ invitations: invitations.map(serializeInvitation) });
  } catch (error) {
    if (isInductionInvitationDatabaseSetupError(error)) return NextResponse.json({ error: "Induction invitation database setup required." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid invitation payload." }, { status: 400 });

  try {
    const { invitation, token } = await createInductionInvitation({
      siteId,
      contractorId,
      projectId: text(body.projectId) || null,
      invitedFullName: text(body.invitedFullName) || null,
      invitedEmail: text(body.invitedEmail) || null,
      invitedPhone: text(body.invitedPhone) || null,
      role: text(body.role) || null,
      expiresAt: text(body.expiresAt) || null,
      createdBy: admin.displayName,
    });
    const inviteUrl = invitationUrl(new URL(request.url).origin, token);
    const publicInvitation = await getPublicInductionInvitation(token);
    const emailInput = publicInvitation
      ? {
          to: publicInvitation.email,
          inviteUrl,
          siteName: publicInvitation.siteName,
          contractorName: publicInvitation.contractorName,
          fullName: publicInvitation.fullName,
          role: publicInvitation.role,
          expiresAt: publicInvitation.expiresAt,
        }
      : null;
    const mailtoHref = emailInput ? buildInductionInviteMailto(emailInput) : "";
    const emailDelivery = emailInput && deliveryMode(body.deliveryMode) === "email" ? await sendInductionInviteEmail(emailInput) : null;

    if (emailDelivery?.status === "sent") {
      await recordSiteActivity({
        siteId: invitation.site_id,
        projectId: invitation.project_id,
        entityType: "induction_invitation",
        entityId: invitation.id,
        eventType: "induction_invite_email_sent",
        title: "Induction invite email sent",
        detail: invitation.invited_full_name || invitation.invited_email || "Invite email sent",
        actor: admin.displayName,
        metadata: { contractorId: invitation.contractor_id },
      });
    }

    return NextResponse.json(
      {
        invitation: serializeInvitation(invitation),
        inviteUrl,
        mailtoHref,
        emailDelivery,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isInductionInvitationDatabaseSetupError(error)) return NextResponse.json({ error: "Induction invitation database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invitation." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid invitation payload." }, { status: 400 });
  if (!text(body.invitationId)) return NextResponse.json({ error: "invitationId is required." }, { status: 400 });
  if (text(body.status) !== "REVOKED") return NextResponse.json({ error: "Only revocation is currently supported." }, { status: 400 });

  try {
    const revoked = await revokeInductionInvitation({
      siteId,
      contractorId,
      invitationId: text(body.invitationId),
      actor: admin.displayName,
    });
    if (!revoked) return NextResponse.json({ error: "Invitation cannot be revoked." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isInductionInvitationDatabaseSetupError(error)) return NextResponse.json({ error: "Induction invitation database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to revoke invitation." }, { status: 400 });
  }
}
