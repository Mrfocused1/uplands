import { randomUUID } from "node:crypto";

import { PERMIT_TEMPLATES, type PermitAnswer, type PermitStatus } from "@/config/permitTemplates";
import { getDb } from "@/lib/db";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export type PermitRow = {
  id: string;
  permit_number: string;
  template_id: string;
  site_id: string;
  project_id: string | null;
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
};

export type PermitAnswerRow = {
  id: string;
  permit_id: string;
  question_key: string;
  answer: PermitAnswer;
  comment: string | null;
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
  sections: Array<PermitTemplateSectionRow & { questions: PermitTemplateQuestionRow[] }>;
};

export type PermitDetail = {
  permit: PermitRow;
  template: PermitTemplateWithSections;
  answers: PermitAnswerRow[];
  signatures: PermitSignatureRow[];
};

export type UpsertPermitInput = {
  contractor: string;
  locationOfWork: string;
  descriptionOfWork: string;
  validFromDate: string;
  validToDate: string;
  validFromTime: string;
  validToTime: string;
  status: PermitStatus;
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
};

function shouldUseSupabasePermitsDb() {
  const provider = env("PERMITS_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("PERMITS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
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

    const questionRows = (questions ?? []) as PermitTemplateQuestionRow[];
    return {
      ...(template as PermitTemplateRow),
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

  return {
    ...template,
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
      `SELECT p.*, t.code AS template_code, t.title AS template_title, s.location AS site_location, pr.name AS project_name
       FROM permits p
       JOIN permit_templates t ON t.id = p.template_id
       JOIN sites s ON s.id = p.site_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       WHERE p.site_id = ?
       ORDER BY p.created_at DESC`,
    )
    .all(siteId) as PermitRow[];
}

export async function countPermitsBySite(siteId: string) {
  const rows = await listPermitsBySite(siteId);
  return {
    active: rows.filter((row) => row.status === "ACTIVE" || row.status === "AUTHORISED").length,
    expiringSoon: rows.filter((row) => (row.status === "ACTIVE" || row.status === "AUTHORISED") && expiresToday(row)).length,
    awaitingClosure: rows.filter((row) => row.status === "WORK_COMPLETED").length,
  };
}

function expiresToday(row: PermitRow) {
  const today = new Date().toISOString().slice(0, 10);
  return row.valid_to_date === today;
}

export async function createPermit(input: {
  siteId: string;
  projectId?: string | null;
  templateId: string;
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
  const permitNumber = await nextPermitNumber(input.templateId, input.siteId);

  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("permits").insert({
      id,
      permit_number: permitNumber,
      template_id: input.templateId,
      site_id: input.siteId,
      project_id: input.projectId ?? null,
      contractor: input.contractor,
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
    return id;
  }

  getDb()
    .prepare(
      `INSERT INTO permits
       (id, permit_number, template_id, site_id, project_id, contractor, location_of_work, description_of_work,
        valid_from_date, valid_to_date, valid_from_time, valid_to_time, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
    )
    .run(
      id,
      permitNumber,
      input.templateId,
      input.siteId,
      input.projectId ?? null,
      input.contractor,
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

  return id;
}

async function nextPermitNumber(templateId: string, siteId: string) {
  const template = await getPermitTemplate(templateId);
  const code = template?.code ?? templateId.toUpperCase();
  const year = new Date().getFullYear();
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const prefix = `${code}-${siteId.toUpperCase()}-${year}-`;
    const { count, error } = await supabase.from("permits").select("id", { count: "exact", head: true }).like("permit_number", `${prefix}%`);
    assertNoError(error, "Unable to generate permit number");
    return `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  const prefix = `${code}-${siteId.toUpperCase()}-${year}-`;
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM permits WHERE permit_number LIKE ?").get(`${prefix}%`) as { count: number };
  return `${prefix}${String(row.count + 1).padStart(4, "0")}`;
}

export async function getPermitDetail(permitId: string): Promise<PermitDetail | null> {
  const permit = await getPermit(permitId);
  if (!permit) return null;
  const template = await getPermitTemplate(permit.template_id);
  if (!template) return null;

  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    const [{ data: answers, error: answersError }, { data: signatures, error: signaturesError }] = await Promise.all([
      supabase.from("permit_answers").select("*").eq("permit_id", permitId).order("question_key"),
      supabase.from("permit_signatures").select("*").eq("permit_id", permitId).order("signed_at"),
    ]);
    assertNoError(answersError, "Unable to get permit answers");
    assertNoError(signaturesError, "Unable to get permit signatures");
    return { permit, template, answers: (answers ?? []) as PermitAnswerRow[], signatures: (signatures ?? []) as PermitSignatureRow[] };
  }

  const answers = getDb().prepare("SELECT * FROM permit_answers WHERE permit_id = ? ORDER BY question_key").all(permitId) as PermitAnswerRow[];
  const signatures = getDb().prepare("SELECT * FROM permit_signatures WHERE permit_id = ? ORDER BY signed_at").all(permitId) as PermitSignatureRow[];
  return { permit, template, answers, signatures };
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
      `SELECT p.*, t.code AS template_code, t.title AS template_title, s.location AS site_location, pr.name AS project_name
       FROM permits p
       JOIN permit_templates t ON t.id = p.template_id
       JOIN sites s ON s.id = p.site_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       WHERE p.id = ?`,
    )
    .get(permitId) as PermitRow | undefined;
  return row ?? null;
}

export async function updatePermit(permitId: string, input: UpsertPermitInput) {
  const now = new Date().toISOString();
  if (shouldUseSupabasePermitsDb()) {
    const supabase = createSupabaseAdminClient();
    assertNoError(
      (
        await supabase
          .from("permits")
          .update({
            contractor: input.contractor,
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
    await replacePermitAnswersSupabase(supabase, permitId, input.answers, now);
    await replacePermitSignaturesSupabase(supabase, permitId, input.signatures, now);
    return;
  }

  const run = getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE permits
         SET contractor = ?, location_of_work = ?, description_of_work = ?, valid_from_date = ?, valid_to_date = ?,
             valid_from_time = ?, valid_to_time = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.contractor, input.locationOfWork, input.descriptionOfWork, input.validFromDate, input.validToDate, input.validFromTime, input.validToTime, input.status, now, permitId);

    const answerStmt = getDb().prepare(
      `INSERT INTO permit_answers (id, permit_id, question_key, answer, comment, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(permit_id, question_key) DO UPDATE SET answer = excluded.answer, comment = excluded.comment, updated_at = excluded.updated_at`,
    );
    for (const answer of input.answers) {
      answerStmt.run(randomUUID(), permitId, answer.questionKey, answer.answer, answer.comment ?? null, now);
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
