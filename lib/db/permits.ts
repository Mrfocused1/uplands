import { randomUUID } from "node:crypto";

import { PERMIT_TEMPLATES, type PermitAnswer, type PermitStatus } from "@/config/permitTemplates";
import { listEntityActivityEvents, recordSiteActivity, type SiteActivityEventRow, type SiteActivityEventType } from "@/lib/db/activity";
import { resolvePermitContractor } from "@/lib/db/contractors";
import { getDb } from "@/lib/db";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_PERMIT_SCHEMA_CODES = new Set(["42P01", "PGRST205"]);

export class PermitDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "PermitDatabaseSetupError";
  }
}

export function isPermitDatabaseSetupError(error: unknown): error is PermitDatabaseSetupError {
  return error instanceof PermitDatabaseSetupError;
}

export type PermitTemplateRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  register_code: string;
  version: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PermitTemplateSectionRow = {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type PermitTemplateQuestionRow = {
  id: string;
  template_id: string;
  section_id: string;
  question_key: string;
  prompt: string;
  help_text: string | null;
  answer_type: string;
  requires_comment_on: string | null;
  sort_order: number;
  created_at: string;
};

export type PermitTemplateFieldRow = {
  id: string;
  template_id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  required: boolean | number;
  options_json: string[] | string | null;
  placeholder: string | null;
  sort_order: number;
  created_at: string;
};

export type PermitRow = {
  id: string;
  permit_number: string;
  template_id: string;
  site_id: string;
  project_id: string | null;
  contractor_id: string | null;
  rams_document_id: string | null;
  contractor: string;
  location_of_work: string;
  description_of_work: string;
  valid_from_date: string;
  valid_to_date: string;
  valid_from_time: string;
  valid_to_time: string;
  status: PermitStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template_code?: string;
  template_title?: string;
  site_location?: string;
  project_name?: string | null;
  rams_document_title?: string | null;
  rams_document_reference?: string | null;
  rams_document_revision?: string | null;
};

export type PermitAnswerRow = {
  id: string;
  permit_id: string;
  question_key: string;
  answer: PermitAnswer;
  comment: string | null;
  updated_at: string;
};

export type PermitFieldValueRow = {
  id: string;
  permit_id: string;
  field_key: string;
  value: string | null;
  updated_at: string;
};

export type PermitSignatureRow = {
  id: string;
  permit_id: string;
  signature_key: string;
  role: string;
  name: string;
  company: string | null;
  position: string | null;
  signed_at: string;
  signature_data_url: string | null;
  action: string;
  created_at: string;
};

export type PermitTemplateWithSections = PermitTemplateRow & {
  fields: PermitTemplateFieldRow[];
  sections: Array<PermitTemplateSectionRow & { questions: PermitTemplateQuestionRow[] }>;
};

export type PermitDetail = {
  permit: PermitRow;
  template: PermitTemplateWithSections;
  fieldValues: PermitFieldValueRow[];
  answers: PermitAnswerRow[];
  signatures: PermitSignatureRow[];
  activity: SiteActivityEventRow[];
};

export type UpsertPermitInput = {
  contractor: string;
  contractorId?: string | null;
  ramsDocumentId?: string | null;
  locationOfWork: string;
  descriptionOfWork: string;
  validFromDate: string;
  validToDate: string;
  validFromTime: string;
  validToTime: string;
  status: PermitStatus;
  fieldValues: Array<{ fieldKey: string; value?: string | null }>;
  answers: Array<{ questionKey: string; answer: PermitAnswer; comment?: string | null }>;
  signatures: Array<{
    signatureKey: string;
    role: string;
    name: string;
    company?: string | null;
    position?: string | null;
    signedAt: string;
    signatureDataUrl?: string | null;
    action: string;
  }>;
  updatedBy?: string | null;
};

function shouldUseSupabasePermitsDb() {
  const provider = env(
    "PERMITS_DATABASE_PROVIDER",
    env("UPLANDS_DATABASE_PROVIDER", env("CONTRACTORS_DATABASE_PROVIDER", env("SUBMISSIONS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"))),
  );
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("PERMITS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_PERMIT_SCHEMA_CODES.has(error.code)) {
    throw new PermitDatabaseSetupError(action, "Permit database tables are not installed in Supabase. Apply supabase/migrations/202608300002_permit_engine_step_ladders.sql.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function rowFromTemplate(templateId: string): PermitTemplateWithSections | null {
  const template = PERMIT_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  const now = new Date().toISOString();
  return {
    id: template.id,
    code: template.code,
    title: template.title,
    description: template.description,
    register_code: template.registerCode,
    version: template.version,
    status: "ACTIVE",
    sort_order: template.sortOrder,
    created_at: now,
    updated_at: now,
    fields: (template.fields ?? []).map((field) => ({
      id: `${template.id}:${field.key}`,
      template_id: template.id,
      field_key: field.key,
      label: field.label,
      help_text: field.helpText ?? null,
      field_type: field.type,
      required: field.required ? 1 : 0,
      options_json: field.options ? JSON.stringify(field.options) : null,
      placeholder: field.placeholder ?? null,
      sort_order: field.sortOrder,
      created_at: now,
    })),
    sections: template.sections.map((section) => ({
      id: `${template.id}:${section.id}`,
      template_id: template.id,
      title: section.title,
      description: section.description ?? null,
      sort_order: section.sortOrder,
      created_at: now,
      questions: section.questions.map((question, index) => ({
        id: `${template.id}:${question.key}`,
        template_id: template.id,
        section_id: `${template.id}:${section.id}`,
        question_key: question.key,
        prompt: question.prompt,
        help_text: question.helpText ?? null,
        answer_type: "YES_NO_NA",
        requires_comment_on: question.requiresCommentOn?.join(",") ?? "NO",
        sort_order: index + 1,
        created_at: now,
      })),
    })),
  };
}

export async function listPermitTemplates(): Promise<PermitTemplateRow[]> {
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("permit_templates").select("*").eq("status", "ACTIVE").order("sort_order");
    assertNoError(error, "Unable to list permit templates");
    return (data ?? []) as PermitTemplateRow[];
  }

  return getDb().prepare("SELECT * FROM permit_templates WHERE status = 'ACTIVE' ORDER BY sort_order, title").all() as PermitTemplateRow[];
}

export async function getPermitTemplate(templateId: string): Promise<PermitTemplateWithSections | null> {
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data: template, error } = await supabase.from("permit_templates").select("*").eq("id", templateId).maybeSingle();
    assertNoError(error, "Unable to get permit template");
    if (!template) return rowFromTemplate(templateId);

    const { data: sections, error: sectionsError } = await supabase
      .from("permit_template_sections")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order");
    assertNoError(sectionsError, "Unable to get permit template sections");

    const { data: questions, error: questionsError } = await supabase
      .from("permit_template_questions")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order");
    assertNoError(questionsError, "Unable to get permit template questions");

    const { data: fields, error: fieldsError } = await supabase
      .from("permit_template_fields")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order");
    assertNoError(fieldsError, "Unable to get permit template fields");

    const questionRows = (questions ?? []) as PermitTemplateQuestionRow[];
    return {
      ...(template as PermitTemplateRow),
      fields: (fields ?? []) as PermitTemplateFieldRow[],
      sections: ((sections ?? []) as PermitTemplateSectionRow[]).map((section) => ({
        ...section,
        questions: questionRows.filter((question) => question.section_id === section.id),
      })),
    };
  }

  const template = getDb().prepare("SELECT * FROM permit_templates WHERE id = ?").get(templateId) as PermitTemplateRow | undefined;
  if (!template) return rowFromTemplate(templateId);
  const sections = getDb()
    .prepare("SELECT * FROM permit_template_sections WHERE template_id = ? ORDER BY sort_order")
    .all(templateId) as PermitTemplateSectionRow[];
  const questions = getDb()
    .prepare("SELECT * FROM permit_template_questions WHERE template_id = ? ORDER BY sort_order")
    .all(templateId) as PermitTemplateQuestionRow[];
  const fields = getDb()
    .prepare("SELECT * FROM permit_template_fields WHERE template_id = ? ORDER BY sort_order")
    .all(templateId) as PermitTemplateFieldRow[];

  return {
    ...template,
    fields,
    sections: sections.map((section) => ({
      ...section,
      questions: questions.filter((question) => question.section_id === section.id),
    })),
  };
}

export async function listPermitsBySite(siteId: string): Promise<PermitRow[]> {
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("permits_with_template").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    assertNoError(error, "Unable to list permits");
    return (data ?? []) as PermitRow[];
  }

  return getDb()
    .prepare(
      `SELECT p.*, t.code AS template_code, t.title AS template_title, s.location AS site_location, pr.name AS project_name,
              rd.title AS rams_document_title, rd.document_reference AS rams_document_reference, rd.revision AS rams_document_revision
       FROM permits p
       JOIN permit_templates t ON t.id = p.template_id
       JOIN sites s ON s.id = p.site_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       LEFT JOIN rams_documents rd ON rd.id = p.rams_document_id
       WHERE p.site_id = ?
       ORDER BY p.created_at DESC`,
    )
    .all(siteId) as PermitRow[];
}

export async function listPermitsByContractor(siteId: string, contractorId: string, contractorName: string): Promise<PermitRow[]> {
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("permits_with_template")
      .select("*")
      .eq("site_id", siteId)
      .or(`contractor_id.eq.${contractorId},contractor.eq.${escapeFilterValue(contractorName)}`)
      .order("created_at", { ascending: false });
    assertNoError(error, "Unable to list contractor permits");
    return (data ?? []) as PermitRow[];
  }

  return getDb()
    .prepare(
      `SELECT p.*, t.code AS template_code, t.title AS template_title, s.location AS site_location, pr.name AS project_name,
              rd.title AS rams_document_title, rd.document_reference AS rams_document_reference, rd.revision AS rams_document_revision
       FROM permits p
       JOIN permit_templates t ON t.id = p.template_id
       JOIN sites s ON s.id = p.site_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       LEFT JOIN rams_documents rd ON rd.id = p.rams_document_id
       WHERE p.site_id = ? AND (p.contractor_id = ? OR p.contractor = ?)
       ORDER BY p.created_at DESC`,
    )
    .all(siteId, contractorId, contractorName) as PermitRow[];
}

export async function countPermitsBySite(siteId: string) {
  let rows: PermitRow[];
  try {
    rows = await listPermitsBySite(siteId);
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) {
      return { active: 0, expiringSoon: 0, awaitingClosure: 0, missingLinkedRams: 0 };
    }
    throw error;
  }
  const openStatuses = new Set<PermitStatus>(["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED"]);
  return {
    active: rows.filter((row) => row.status === "ACTIVE" || row.status === "AUTHORISED").length,
    expiringSoon: rows.filter((row) => (row.status === "ACTIVE" || row.status === "AUTHORISED") && expiresToday(row)).length,
    awaitingClosure: rows.filter((row) => row.status === "WORK_COMPLETED").length,
    missingLinkedRams: rows.filter((row) => openStatuses.has(row.status) && !row.rams_document_id).length,
  };
}

export async function listPriorityPermitsBySite(siteId: string, limit = 6): Promise<PermitRow[]> {
  const rows = await listPermitsBySite(siteId);
  const priority = new Map<PermitStatus, number>([
    ["ACTIVE", 0],
    ["AUTHORISED", 1],
    ["WORK_COMPLETED", 2],
    ["AWAITING_REVIEW", 3],
    ["DRAFT", 4],
    ["EXPIRED", 5],
    ["REJECTED", 6],
    ["CANCELLED", 7],
    ["CLOSED", 8],
  ]);
  return rows
    .filter((row) => row.status === "ACTIVE" || row.status === "AUTHORISED" || row.status === "WORK_COMPLETED" || row.status === "AWAITING_REVIEW")
    .sort((a, b) => {
      const statusSort = (priority.get(a.status) ?? 99) - (priority.get(b.status) ?? 99);
      if (statusSort !== 0) return statusSort;
      const dateSort = a.valid_to_date.localeCompare(b.valid_to_date);
      if (dateSort !== 0) return dateSort;
      return a.valid_to_time.localeCompare(b.valid_to_time);
    })
    .slice(0, limit);
}

function escapeFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(")", "\\)");
}

function expiresToday(row: PermitRow) {
  const today = new Date().toISOString().slice(0, 10);
  return row.valid_to_date === today;
}

export async function createPermit(input: {
  siteId: string;
  projectId?: string | null;
  templateId: string;
  contractorId?: string | null;
  ramsDocumentId?: string | null;
  contractor: string;
  locationOfWork: string;
  descriptionOfWork: string;
  validFromDate: string;
  validToDate: string;
  validFromTime: string;
  validToTime: string;
  createdBy?: string | null;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const template = await getPermitTemplate(input.templateId);
  const contractor = await resolvePermitContractor({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    contractorId: input.contractorId ?? null,
    contractorName: input.contractor,
  });
  const permitNumber = await nextPermitNumber(input.templateId, input.siteId);

  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("permits").insert({
      id,
      permit_number: permitNumber,
      template_id: input.templateId,
      site_id: input.siteId,
      project_id: input.projectId ?? null,
      contractor_id: contractor.contractorId,
      rams_document_id: input.ramsDocumentId ?? null,
      contractor: contractor.contractorName,
      location_of_work: input.locationOfWork,
      description_of_work: input.descriptionOfWork,
      valid_from_date: input.validFromDate,
      valid_to_date: input.validToDate,
      valid_from_time: input.validFromTime,
      valid_to_time: input.validToTime,
      status: "DRAFT",
      created_by: input.createdBy ?? null,
      created_at: now,
      updated_at: now,
    });
    assertNoError(error, "Unable to create permit");
    await recordPermitActivity({
      permitId: id,
      siteId: input.siteId,
      projectId: input.projectId ?? null,
      eventType: "permit_created",
      title: "Permit created",
      detail: `${template?.title ?? input.templateId} · ${contractor.contractorName} · ${permitNumber}`,
      actor: input.createdBy ?? null,
      metadata: { permitNumber, templateId: input.templateId, status: "DRAFT" },
    });
    return id;
  }

  getDb()
    .prepare(
      `INSERT INTO permits
       (id, permit_number, template_id, site_id, project_id, contractor_id, rams_document_id, contractor, location_of_work, description_of_work,
        valid_from_date, valid_to_date, valid_from_time, valid_to_time, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
    )
    .run(
      id,
      permitNumber,
      input.templateId,
      input.siteId,
      input.projectId ?? null,
      contractor.contractorId,
      input.ramsDocumentId ?? null,
      contractor.contractorName,
      input.locationOfWork,
      input.descriptionOfWork,
      input.validFromDate,
      input.validToDate,
      input.validFromTime,
      input.validToTime,
      input.createdBy ?? null,
      now,
      now,
    );

  await recordPermitActivity({
    permitId: id,
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    eventType: "permit_created",
    title: "Permit created",
    detail: `${template?.title ?? input.templateId} · ${contractor.contractorName} · ${permitNumber}`,
    actor: input.createdBy ?? null,
    metadata: { permitNumber, templateId: input.templateId, status: "DRAFT" },
  });

  return id;
}

async function nextPermitNumber(templateId: string, siteId: string) {
  const template = await getPermitTemplate(templateId);
  const code = template?.code ?? templateId.toUpperCase();
  const year = new Date().getFullYear();
  const prefix = `${code}-${siteId.toUpperCase()}-${year}-`;
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("next_permit_register_number", {
      p_template_id: templateId,
      p_site_id: siteId,
      p_year: year,
      p_prefix: prefix,
    });
    assertNoError(error, "Unable to generate permit number");
    return String(data);
  }

  return getDb().transaction(() => {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO permit_register_sequences (id, template_id, site_id, year, prefix, last_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)
         ON CONFLICT(template_id, site_id, year) DO NOTHING`,
      )
      .run(randomUUID(), templateId, siteId, year, prefix, now, now);

    const row = getDb()
      .prepare(
        `UPDATE permit_register_sequences
         SET last_number = last_number + 1, prefix = ?, updated_at = ?
         WHERE template_id = ? AND site_id = ? AND year = ?
         RETURNING last_number`,
      )
      .get(prefix, now, templateId, siteId, year) as { last_number: number };
    return `${prefix}${String(row.last_number).padStart(4, "0")}`;
  })();
}

export async function getPermitDetail(permitId: string): Promise<PermitDetail | null> {
  const permit = await getPermit(permitId);
  if (!permit) return null;
  const template = await getPermitTemplate(permit.template_id);
  if (!template) return null;

  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const [{ data: fieldValues, error: fieldValuesError }, { data: answers, error: answersError }, { data: signatures, error: signaturesError }, activity] = await Promise.all([
      supabase.from("permit_field_values").select("*").eq("permit_id", permitId).order("field_key"),
      supabase.from("permit_answers").select("*").eq("permit_id", permitId).order("question_key"),
      supabase.from("permit_signatures").select("*").eq("permit_id", permitId).order("signed_at"),
      listEntityActivityEvents("permit", permitId),
    ]);
    assertNoError(fieldValuesError, "Unable to get permit field values");
    assertNoError(answersError, "Unable to get permit answers");
    assertNoError(signaturesError, "Unable to get permit signatures");
    return {
      permit,
      template,
      fieldValues: (fieldValues ?? []) as PermitFieldValueRow[],
      answers: (answers ?? []) as PermitAnswerRow[],
      signatures: (signatures ?? []) as PermitSignatureRow[],
      activity,
    };
  }

  const fieldValues = getDb().prepare("SELECT * FROM permit_field_values WHERE permit_id = ? ORDER BY field_key").all(permitId) as PermitFieldValueRow[];
  const answers = getDb().prepare("SELECT * FROM permit_answers WHERE permit_id = ? ORDER BY question_key").all(permitId) as PermitAnswerRow[];
  const signatures = getDb().prepare("SELECT * FROM permit_signatures WHERE permit_id = ? ORDER BY signed_at").all(permitId) as PermitSignatureRow[];
  const activity = await listEntityActivityEvents("permit", permitId);
  return { permit, template, fieldValues, answers, signatures, activity };
}

async function getPermit(permitId: string): Promise<PermitRow | null> {
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("permits_with_template").select("*").eq("id", permitId).maybeSingle();
    assertNoError(error, "Unable to get permit");
    return (data as PermitRow | null) ?? null;
  }

  const row = getDb()
    .prepare(
      `SELECT p.*, t.code AS template_code, t.title AS template_title, s.location AS site_location, pr.name AS project_name,
              rd.title AS rams_document_title, rd.document_reference AS rams_document_reference, rd.revision AS rams_document_revision
       FROM permits p
       JOIN permit_templates t ON t.id = p.template_id
       JOIN sites s ON s.id = p.site_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       LEFT JOIN rams_documents rd ON rd.id = p.rams_document_id
       WHERE p.id = ?`,
    )
    .get(permitId) as PermitRow | undefined;
  return row ?? null;
}

export async function updatePermit(permitId: string, input: UpsertPermitInput) {
  const now = new Date().toISOString();
  const existingPermit = await getPermit(permitId);
  const existingSignatureKeys = await listPermitSignatureKeys(permitId);
  const contractor = existingPermit
    ? await resolvePermitContractor({
        siteId: existingPermit.site_id,
        projectId: existingPermit.project_id,
        contractorId: input.contractorId ?? null,
        contractorName: input.contractor,
      })
    : { contractorId: input.contractorId ?? null, contractorName: input.contractor };
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError(
      (
        await supabase
          .from("permits")
          .update({
            contractor_id: contractor.contractorId,
            rams_document_id: input.ramsDocumentId ?? null,
            contractor: contractor.contractorName,
            location_of_work: input.locationOfWork,
            description_of_work: input.descriptionOfWork,
            valid_from_date: input.validFromDate,
            valid_to_date: input.validToDate,
            valid_from_time: input.validFromTime,
            valid_to_time: input.validToTime,
            status: input.status,
            updated_at: now,
          })
          .eq("id", permitId)
      ).error,
      "Unable to update permit",
    );
    await replacePermitFieldValuesSupabase(supabase, permitId, input.fieldValues, now);
    await replacePermitAnswersSupabase(supabase, permitId, input.answers, now);
    await replacePermitSignaturesSupabase(supabase, permitId, input.signatures, now);
    await recordPermitUpdateActivity(permitId, existingPermit, existingSignatureKeys, input);
    return;
  }

  const run = getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE permits
         SET contractor_id = ?, contractor = ?, location_of_work = ?, description_of_work = ?, valid_from_date = ?, valid_to_date = ?,
             valid_from_time = ?, valid_to_time = ?, status = ?, rams_document_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(contractor.contractorId, contractor.contractorName, input.locationOfWork, input.descriptionOfWork, input.validFromDate, input.validToDate, input.validFromTime, input.validToTime, input.status, input.ramsDocumentId ?? null, now, permitId);

    const answerStmt = getDb().prepare(
      `INSERT INTO permit_answers (id, permit_id, question_key, answer, comment, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(permit_id, question_key) DO UPDATE SET answer = excluded.answer, comment = excluded.comment, updated_at = excluded.updated_at`,
    );
    for (const answer of input.answers) {
      answerStmt.run(randomUUID(), permitId, answer.questionKey, answer.answer, answer.comment ?? null, now);
    }

    const fieldValueStmt = getDb().prepare(
      `INSERT INTO permit_field_values (id, permit_id, field_key, value, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(permit_id, field_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    for (const fieldValue of input.fieldValues) {
      fieldValueStmt.run(randomUUID(), permitId, fieldValue.fieldKey, fieldValue.value ?? null, now);
    }

    const signatureStmt = getDb().prepare(
      `INSERT INTO permit_signatures (id, permit_id, signature_key, role, name, company, position, signed_at, signature_data_url, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(permit_id, signature_key) DO UPDATE SET
         role = excluded.role,
         name = excluded.name,
         company = excluded.company,
         position = excluded.position,
         signed_at = excluded.signed_at,
         signature_data_url = excluded.signature_data_url,
         action = excluded.action`,
    );
    for (const signature of input.signatures) {
      signatureStmt.run(
        randomUUID(),
        permitId,
        signature.signatureKey,
        signature.role,
        signature.name,
        signature.company ?? null,
        signature.position ?? null,
        signature.signedAt,
        signature.signatureDataUrl ?? null,
        signature.action,
        now,
      );
    }
  });

  run();
  await recordPermitUpdateActivity(permitId, existingPermit, existingSignatureKeys, input);
}

async function listPermitSignatureKeys(permitId: string) {
  if (shouldUseSupabasePermitsDb()) {
    const { data, error } = await createSupabaseAdminClient().from("permit_signatures").select("signature_key").eq("permit_id", permitId);
    assertNoError(error, "Unable to list permit signatures");
    return new Set((data ?? []).map((row) => String(row.signature_key)));
  }

  const rows = getDb().prepare("SELECT signature_key FROM permit_signatures WHERE permit_id = ?").all(permitId) as Array<{ signature_key: string }>;
  return new Set(rows.map((row) => row.signature_key));
}

function statusActivity(status: PermitStatus): { eventType: SiteActivityEventType; title: string } | null {
  switch (status) {
    case "AWAITING_REVIEW":
      return { eventType: "permit_submitted", title: "Permit submitted for review" };
    case "AUTHORISED":
      return { eventType: "permit_authorised", title: "Permit authorised" };
    case "ACTIVE":
      return { eventType: "permit_activated", title: "Permit activated" };
    case "WORK_COMPLETED":
      return { eventType: "permit_work_completed", title: "Permit work completed" };
    case "CLOSED":
      return { eventType: "permit_closed", title: "Permit closed" };
    case "REJECTED":
      return { eventType: "permit_rejected", title: "Permit rejected" };
    case "EXPIRED":
      return { eventType: "permit_expired", title: "Permit expired" };
    case "CANCELLED":
      return { eventType: "permit_cancelled", title: "Permit cancelled" };
    default:
      return null;
  }
}

async function recordPermitUpdateActivity(permitId: string, existingPermit: PermitRow | null, existingSignatureKeys: Set<string>, input: UpsertPermitInput) {
  if (!existingPermit) return;

  const actor = input.updatedBy ?? null;
  const baseDetail = `${existingPermit.permit_number} · ${input.contractor}`;
  if (existingPermit.status !== input.status) {
    const event = statusActivity(input.status);
    if (event) {
      await recordPermitActivity({
        permitId,
        siteId: existingPermit.site_id,
        projectId: existingPermit.project_id,
        eventType: event.eventType,
        title: event.title,
        detail: baseDetail,
        actor,
        metadata: { fromStatus: existingPermit.status, toStatus: input.status },
      });
    }
  }

  for (const signature of input.signatures) {
    if (existingSignatureKeys.has(signature.signatureKey)) continue;
    await recordPermitActivity({
      permitId,
      siteId: existingPermit.site_id,
      projectId: existingPermit.project_id,
      eventType: "permit_signature_recorded",
      title: signature.action,
      detail: `${baseDetail} · ${signature.name}${signature.company ? ` · ${signature.company}` : ""}`,
      actor: actor ?? signature.name,
      metadata: { signatureKey: signature.signatureKey, role: signature.role },
    });
  }
}

async function recordPermitActivity(input: {
  permitId: string;
  siteId: string;
  projectId?: string | null;
  eventType: SiteActivityEventType;
  title: string;
  detail: string;
  actor?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    entityType: "permit",
    entityId: input.permitId,
    eventType: input.eventType,
    title: input.title,
    detail: input.detail,
    actor: input.actor ?? null,
    metadata: input.metadata ?? null,
  });
}

async function replacePermitAnswersSupabase(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  permitId: string,
  answers: UpsertPermitInput["answers"],
  now: string,
) {
  if (answers.length === 0) return;
  const { error } = await supabase.from("permit_answers").upsert(
    answers.map((answer) => ({
      id: randomUUID(),
      permit_id: permitId,
      question_key: answer.questionKey,
      answer: answer.answer,
      comment: answer.comment ?? null,
      updated_at: now,
    })),
    { onConflict: "permit_id,question_key" },
  );
  assertNoError(error, "Unable to save permit answers");
}

async function replacePermitFieldValuesSupabase(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  permitId: string,
  fieldValues: UpsertPermitInput["fieldValues"],
  now: string,
) {
  if (fieldValues.length === 0) return;
  const { error } = await supabase.from("permit_field_values").upsert(
    fieldValues.map((fieldValue) => ({
      id: randomUUID(),
      permit_id: permitId,
      field_key: fieldValue.fieldKey,
      value: fieldValue.value ?? null,
      updated_at: now,
    })),
    { onConflict: "permit_id,field_key" },
  );
  assertNoError(error, "Unable to save permit field values");
}

async function replacePermitSignaturesSupabase(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  permitId: string,
  signatures: UpsertPermitInput["signatures"],
  now: string,
) {
  if (signatures.length === 0) return;
  const { error } = await supabase.from("permit_signatures").upsert(
    signatures.map((signature) => ({
      id: randomUUID(),
      permit_id: permitId,
      signature_key: signature.signatureKey,
      role: signature.role,
      name: signature.name,
      company: signature.company ?? null,
      position: signature.position ?? null,
      signed_at: signature.signedAt,
      signature_data_url: signature.signatureDataUrl ?? null,
      action: signature.action,
      created_at: now,
    })),
    { onConflict: "permit_id,signature_key" },
  );
  assertNoError(error, "Unable to save permit signatures");
}
