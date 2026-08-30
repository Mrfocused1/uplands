import { boolEnv, env } from "@/lib/env";

import { sendSmtpMail, type SmtpConfig } from "./smtp";

export type InductionInviteEmailInput = {
  to: string | null;
  inviteUrl: string;
  siteName: string;
  contractorName: string;
  fullName?: string | null;
  role?: string | null;
  expiresAt: string;
};

export type InductionInviteEmailDelivery =
  | { status: "sent"; message: string }
  | { status: "missing_recipient"; message: string }
  | { status: "not_configured"; message: string }
  | { status: "failed"; message: string };

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(value));
}

function smtpConfig(): { config: SmtpConfig; from: string } | null {
  const host = env("UPLANDS_SMTP_HOST");
  const from = env("UPLANDS_EMAIL_FROM");
  if (!host || !from) return null;

  const port = Number(env("UPLANDS_SMTP_PORT", "587"));
  if (!Number.isFinite(port)) return null;
  const timeoutMs = Number(env("UPLANDS_SMTP_TIMEOUT_MS", "10000"));

  return {
    from,
    config: {
      host,
      port,
      secure: boolEnv("UPLANDS_SMTP_SECURE", port === 465),
      requireTls: boolEnv("UPLANDS_SMTP_REQUIRE_TLS", true),
      user: env("UPLANDS_SMTP_USER") || undefined,
      pass: env("UPLANDS_SMTP_PASS") || undefined,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
    },
  };
}

function subject(input: InductionInviteEmailInput) {
  return `Uplands site induction - ${input.siteName}`;
}

function textBody(input: InductionInviteEmailInput) {
  const greeting = input.fullName ? `Hello ${input.fullName},` : "Hello,";
  const roleLine = input.role ? [`Role / trade: ${input.role}`] : [];
  return [
    greeting,
    "",
    `You have been invited to complete the Uplands site induction for ${input.siteName}.`,
    `Contractor: ${input.contractorName}`,
    ...roleLine,
    "",
    "Complete the induction before arriving on site:",
    input.inviteUrl,
    "",
    `This secure invite link expires on ${formatExpiry(input.expiresAt)}.`,
    "",
    "Uplands",
  ].join("\n");
}

function htmlBody(input: InductionInviteEmailInput) {
  const name = input.fullName ? input.fullName : "there";
  return [
    `<p>Hello ${escapeHtml(name)},</p>`,
    `<p>You have been invited to complete the Uplands site induction for <strong>${escapeHtml(input.siteName)}</strong>.</p>`,
    `<p><strong>Contractor:</strong> ${escapeHtml(input.contractorName)}${input.role ? `<br><strong>Role / trade:</strong> ${escapeHtml(input.role)}` : ""}</p>`,
    `<p><a href="${escapeHtml(input.inviteUrl)}">Complete induction</a></p>`,
    `<p>This secure invite link expires on ${escapeHtml(formatExpiry(input.expiresAt))}.</p>`,
    "<p>Uplands</p>",
  ].join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function buildInductionInviteMailto(input: InductionInviteEmailInput) {
  const recipient = input.to?.trim() ?? "";
  const params = new URLSearchParams({
    subject: subject(input),
    body: textBody(input),
  });
  return `mailto:${encodeURIComponent(recipient)}?${params.toString()}`;
}

export async function sendInductionInviteEmail(input: InductionInviteEmailInput): Promise<InductionInviteEmailDelivery> {
  const to = input.to?.trim();
  if (!to) {
    return { status: "missing_recipient", message: "Add an operative email address before sending." };
  }

  const configured = smtpConfig();
  if (!configured) {
    return { status: "not_configured", message: "Email sending is not configured. Use Copy Link or Open Email." };
  }

  try {
    await sendSmtpMail(configured.config, {
      from: configured.from,
      to,
      subject: subject(input),
      text: textBody(input),
      html: htmlBody(input),
    });
    return { status: "sent", message: "Invite email sent." };
  } catch (error) {
    return { status: "failed", message: error instanceof Error ? error.message : "Invite email could not be sent." };
  }
}
