import { NextResponse } from "next/server";

import { PERMIT_TEMPLATES, type PermitAnswer, type PermitStatus } from "@/config/permitTemplates";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getPermitDetail, updatePermit } from "@/lib/db/permits";

export const runtime = "nodejs";

const statuses: PermitStatus[] = ["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED", "CLOSED", "REJECTED", "EXPIRED", "CANCELLED"];
const answers: PermitAnswer[] = ["YES", "NO", "NA"];

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeDetail(detail: NonNullable<Awaited<ReturnType<typeof getPermitDetail>>>) {
  const templateConfig = PERMIT_TEMPLATES.find((template) => template.id === detail.template.id);
  return {
    permit: {
      id: detail.permit.id,
      permitNumber: detail.permit.permit_number,
      templateId: detail.permit.template_id,
      templateCode: detail.permit.template_code,
      templateTitle: detail.permit.template_title,
      siteId: detail.permit.site_id,
      siteLocation: detail.permit.site_location,
      projectId: detail.permit.project_id,
      projectName: detail.permit.project_name,
      contractor: detail.permit.contractor,
      locationOfWork: detail.permit.location_of_work,
      descriptionOfWork: detail.permit.description_of_work,
      validFromDate: detail.permit.valid_from_date,
      validToDate: detail.permit.valid_to_date,
      validFromTime: detail.permit.valid_from_time,
      validToTime: detail.permit.valid_to_time,
      status: detail.permit.status,
      createdBy: detail.permit.created_by,
      createdAt: detail.permit.created_at,
      updatedAt: detail.permit.updated_at,
    },
    template: {
      id: detail.template.id,
      code: detail.template.code,
      title: detail.template.title,
      description: detail.template.description,
      registerCode: detail.template.register_code,
      version: detail.template.version,
      signatures: templateConfig?.signatures ?? [],
      sections: detail.template.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        questions: section.questions.map((question) => ({
          key: question.question_key,
          prompt: question.prompt,
          helpText: question.help_text,
          requiresCommentOn: (question.requires_comment_on ?? "NO").split(",").filter(Boolean),
        })),
      })),
    },
    answers: detail.answers.map((answer) => ({
      questionKey: answer.question_key,
      answer: answer.answer,
      comment: answer.comment,
    })),
    signatures: detail.signatures.map((signature) => ({
      signatureKey: signature.signature_key,
      role: signature.role,
      name: signature.name,
      company: signature.company,
      position: signature.position,
      signedAt: signature.signed_at,
      signatureDataUrl: signature.signature_data_url,
      action: signature.action,
    })),
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const detail = await getPermitDetail(id);
  if (!detail) return NextResponse.json({ error: "Permit not found." }, { status: 404 });
  return NextResponse.json(serializeDetail(detail));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid permit payload." }, { status: 400 });

  const status = text(body.status) as PermitStatus;
  if (!statuses.includes(status)) return NextResponse.json({ error: "Invalid permit status." }, { status: 400 });

  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  const parsedAnswers = rawAnswers.map((item) => {
    const row = item as Record<string, unknown>;
    const answer = text(row.answer) as PermitAnswer;
    if (!answers.includes(answer)) throw new Error("Invalid answer.");
    return {
      questionKey: text(row.questionKey),
      answer,
      comment: text(row.comment) || null,
    };
  });

  const rawSignatures = Array.isArray(body.signatures) ? body.signatures : [];
  const parsedSignatures = rawSignatures
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        signatureKey: text(row.signatureKey),
        role: text(row.role),
        name: text(row.name),
        company: text(row.company) || null,
        position: text(row.position) || null,
        signedAt: text(row.signedAt),
        signatureDataUrl: text(row.signatureDataUrl) || null,
        action: text(row.action),
      };
    })
    .filter((item) => item.signatureKey && item.role && item.name && item.signedAt && item.action);

  await updatePermit(id, {
    contractor: text(body.contractor),
    locationOfWork: text(body.locationOfWork),
    descriptionOfWork: text(body.descriptionOfWork),
    validFromDate: text(body.validFromDate),
    validToDate: text(body.validToDate),
    validFromTime: text(body.validFromTime),
    validToTime: text(body.validToTime),
    status,
    answers: parsedAnswers,
    signatures: parsedSignatures,
  });

  return NextResponse.json({ ok: true });
}
