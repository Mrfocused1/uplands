import { NextResponse } from "next/server";

import { PERMIT_TEMPLATES } from "@/config/permitTemplates";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getPermitDetail, isPermitDatabaseSetupError, updatePermit } from "@/lib/db/permits";
import { isPermitAnswer, isPermitStatus, validatePermitUpdate } from "@/lib/permits/lifecycle";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fieldOptions(value: string[] | string | null) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
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
      contractorId: detail.permit.contractor_id,
      ramsDocumentId: detail.permit.rams_document_id,
      ramsDocumentTitle: detail.permit.rams_document_title,
      ramsDocumentReference: detail.permit.rams_document_reference,
      ramsDocumentRevision: detail.permit.rams_document_revision,
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
      fields: detail.template.fields.map((field) => ({
        key: field.field_key,
        label: field.label,
        helpText: field.help_text,
        type: field.field_type,
        required: Boolean(field.required),
        options: fieldOptions(field.options_json),
        placeholder: field.placeholder,
        sortOrder: field.sort_order,
      })),
      sections: detail.template.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        questions: section.questions.map((question) => ({
          key: question.question_key,
          prompt: question.prompt,
          helpText: question.help_text,
          requiresCommentOn: (question.requires_comment_on ?? "NO").split(",").filter(isPermitAnswer),
        })),
      })),
    },
    fieldValues: detail.fieldValues.map((fieldValue) => ({
      fieldKey: fieldValue.field_key,
      value: fieldValue.value,
    })),
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
    activity: detail.activity.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      title: event.title,
      detail: event.detail,
      actor: event.actor,
      occurredAt: event.occurred_at,
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
  let detail;
  try {
    detail = await getPermitDetail(id);
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) return NextResponse.json({ error: "Permit database setup required." }, { status: 503 });
    throw error;
  }
  if (!detail) return NextResponse.json({ error: "Permit not found." }, { status: 404 });
  return NextResponse.json(serializeDetail(detail));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid permit payload." }, { status: 400 });

  const status = text(body.status);
  if (!isPermitStatus(status)) return NextResponse.json({ error: "Invalid permit status." }, { status: 400 });

  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  const rawFieldValues = Array.isArray(body.fieldValues) ? body.fieldValues : [];
  const parsedFieldValues = rawFieldValues
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        fieldKey: text(row.fieldKey),
        value: text(row.value) || null,
      };
    })
    .filter((item) => item.fieldKey);

  const parsedAnswers = rawAnswers.map((item) => {
    const row = item as Record<string, unknown>;
    const answer = text(row.answer);
    if (!isPermitAnswer(answer)) throw new Error("Invalid answer.");
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

  let detail;
  try {
    detail = await getPermitDetail(id);
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) return NextResponse.json({ error: "Permit database setup required." }, { status: 503 });
    throw error;
  }
  if (!detail) return NextResponse.json({ error: "Permit not found." }, { status: 404 });
  if (!text(body.contractorId) && !text(body.contractor)) return NextResponse.json({ error: "contractor is required." }, { status: 400 });

  const validation = validatePermitUpdate({
    currentStatus: detail.permit.status,
    nextStatus: status,
    contractor: text(body.contractor),
    fields: detail.template.fields.map((field) => ({ key: field.field_key, label: field.label, required: Boolean(field.required) })),
    fieldValues: parsedFieldValues,
    questions: detail.template.sections.flatMap((section) =>
      section.questions.map((question) => ({
        key: question.question_key,
        prompt: question.prompt,
        requiresCommentOn: (question.requires_comment_on ?? "NO").split(",").filter(isPermitAnswer),
      })),
    ),
    answers: parsedAnswers,
    signatures: parsedSignatures,
  });
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });

  try {
    await updatePermit(id, {
      contractor: text(body.contractor),
      contractorId: text(body.contractorId) || null,
      ramsDocumentId: text(body.ramsDocumentId) || null,
      locationOfWork: text(body.locationOfWork),
      descriptionOfWork: text(body.descriptionOfWork),
      validFromDate: text(body.validFromDate),
      validToDate: text(body.validToDate),
      validFromTime: text(body.validFromTime),
      validToTime: text(body.validToTime),
      status,
      fieldValues: parsedFieldValues,
      answers: parsedAnswers,
      signatures: parsedSignatures,
      updatedBy: admin.displayName,
    });
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) return NextResponse.json({ error: "Permit database setup required." }, { status: 503 });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
