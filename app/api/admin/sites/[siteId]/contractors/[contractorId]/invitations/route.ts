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

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
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

async function createInvitationPayload(input: {
  siteId: string;
  contractorId: string;
  projectId: string | null;
  invitedFullName: string | null;
  invitedEmail: string | null;
  invitedPhone: string | null;
  role: string | null;
  expiresAt: string | null;
  deliveryModeValue: string;
  origin: string;
  actor: string;
}) {
  const { invitation, token } = await createInductionInvitation({
    siteId: input.siteId,
    contractorId: input.contractorId,
    projectId: input.projectId,
    invitedFullName: input.invitedFullName,
    invitedEmail: input.invitedEmail,
    invitedPhone: input.invitedPhone,
    role: input.role,
    expiresAt: input.expiresAt,
    createdBy: input.actor,
  });
  const inviteUrl = invitationUrl(input.origin, token);
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
  const emailDelivery = emailInput && deliveryMode(input.deliveryModeValue) === "email" ? await sendInductionInviteEmail(emailInput) : null;

  if (emailDelivery?.status === "sent") {
    await recordSiteActivity({
      siteId: invitation.site_id,
      projectId: invitation.project_id,
      entityType: "induction_invitation",
      entityId: invitation.id,
      eventType: "induction_invite_email_sent",
      title: "Induction invite email sent",
      detail: invitation.invited_full_name || invitation.invited_email || "Invite email sent",
      actor: input.actor,
      metadata: { contractorId: invitation.contractor_id },
    });
  }

  return {
    invitation: serializeInvitation(invitation),
    inviteUrl,
    mailtoHref,
    emailDelivery,
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
    const origin = new URL(request.url).origin;
    const batch = Array.isArray(body.invitations) ? body.invitations : null;
    if (batch) {
      const rows = batch
        .map(objectValue)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .filter((item) => text(item.invitedFullName) || text(item.invitedEmail) || text(item.invitedPhone));
      if (rows.length === 0) return NextResponse.json({ error: "At least one invitee is required." }, { status: 400 });

      const results = [];
      for (const row of rows) {
        results.push(
          await createInvitationPayload({
            siteId,
            contractorId,
            projectId: text(row.projectId) || text(body.projectId) || null,
            invitedFullName: text(row.invitedFullName) || null,
            invitedEmail: text(row.invitedEmail) || null,
            invitedPhone: text(row.invitedPhone) || null,
            role: text(row.role) || null,
            expiresAt: text(row.expiresAt) || text(body.expiresAt) || null,
            deliveryModeValue: text(row.deliveryMode) || text(body.deliveryMode),
            origin,
            actor: admin.displayName,
          }),
        );
      }

      return NextResponse.json(
        {
          invitations: results.map((result) => result.invitation),
          inviteUrls: results.map((result) => result.inviteUrl),
          mailtoHrefs: results.map((result) => result.mailtoHref),
          emailDeliveries: results.map((result) => result.emailDelivery),
        },
        { status: 201 },
      );
    }

    const result = await createInvitationPayload({
      siteId,
      contractorId,
      projectId: text(body.projectId) || null,
      invitedFullName: text(body.invitedFullName) || null,
      invitedEmail: text(body.invitedEmail) || null,
      invitedPhone: text(body.invitedPhone) || null,
      role: text(body.role) || null,
      expiresAt: text(body.expiresAt) || null,
      deliveryModeValue: text(body.deliveryMode),
      origin,
      actor: admin.displayName,
    });

    return NextResponse.json(
      {
        invitation: result.invitation,
        inviteUrl: result.inviteUrl,
        mailtoHref: result.mailtoHref,
        emailDelivery: result.emailDelivery,
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
