"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { SignaturePad } from "@/components/induction/SignaturePad";
import type { PermitAnswer, PermitSignatureKey, PermitStatus } from "@/config/permitTemplates";

type Site = { id: string; location: string; project_id: string | null; project_name: string | null };
type Template = { id: string; code: string; title: string; description: string };
type PermitListItem = {
  id: string;
  permitNumber: string;
  templateCode?: string;
  templateTitle?: string;
  contractor: string;
  locationOfWork: string;
  validToDate: string;
  validToTime: string;
  status: PermitStatus;
};

type PermitDetail = {
  permit: {
    id: string;
    permitNumber: string;
    contractor: string;
    locationOfWork: string;
    descriptionOfWork: string;
    validFromDate: string;
    validToDate: string;
    validFromTime: string;
    validToTime: string;
    status: PermitStatus;
  };
  template: {
    code: string;
    title: string;
    signatures: Array<{ key: PermitSignatureKey; title: string; role: string; action: string }>;
    sections: Array<{
      id: string;
      title: string;
      description: string | null;
      questions: Array<{ key: string; prompt: string; helpText: string | null; requiresCommentOn: string[] }>;
    }>;
  };
  answers: Array<{ questionKey: string; answer: PermitAnswer; comment: string | null }>;
  signatures: Array<{
    signatureKey: PermitSignatureKey;
    role: string;
    name: string;
    company: string | null;
    position: string | null;
    signedAt: string;
    signatureDataUrl: string | null;
    action: string;
  }>;
  activity: Array<{
    id: string;
    eventType: string;
    title: string;
    detail: string;
    actor: string | null;
    occurredAt: string;
  }>;
};

const statuses: PermitStatus[] = ["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED", "CLOSED", "REJECTED", "EXPIRED", "CANCELLED"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

function lifecycleActions(status: PermitStatus) {
  switch (status) {
    case "DRAFT":
      return [{ label: "Submit for Review", status: "AWAITING_REVIEW" as const }];
    case "AWAITING_REVIEW":
      return [
        { label: "Authorise Permit", status: "AUTHORISED" as const },
        { label: "Reject Permit", status: "REJECTED" as const },
      ];
    case "AUTHORISED":
      return [
        { label: "Mark Active", status: "ACTIVE" as const },
        { label: "Cancel Permit", status: "CANCELLED" as const },
      ];
    case "ACTIVE":
      return [
        { label: "Mark Work Complete", status: "WORK_COMPLETED" as const },
        { label: "Cancel Permit", status: "CANCELLED" as const },
      ];
    case "WORK_COMPLETED":
      return [{ label: "Close Permit", status: "CLOSED" as const }];
    default:
      return [];
  }
}

function blankSignature(signature: PermitDetail["template"]["signatures"][number]) {
  return {
    signatureKey: signature.key,
    role: signature.role,
    name: "",
    company: "",
    position: "",
    signedAt: new Date().toISOString(),
    signatureDataUrl: null,
    action: signature.action,
  };
}

function permitValidationError(current: PermitDetail) {
  const questionKeys = current.template.sections.flatMap((section) => section.questions.map((question) => question.key));
  const answered = new Set(current.answers.map((answer) => answer.questionKey));
  const requiresAnsweredQuestions = ["AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED", "CLOSED"].includes(current.permit.status);
  if (requiresAnsweredQuestions && questionKeys.some((key) => !answered.has(key))) return "All permit questions need an answer before review or authorisation.";
  const signed = new Set(current.signatures.filter((signature) => signature.name.trim()).map((signature) => signature.signatureKey));
  if ((current.permit.status === "AUTHORISED" || current.permit.status === "ACTIVE") && !signed.has("manager_authorisation")) return "Manager authorisation is required before the permit can be authorised or active.";
  if (current.permit.status === "WORK_COMPLETED" && !signed.has("contractor_completion")) return "Contractor completion is required before marking work completed.";
  if (current.permit.status === "CLOSED" && (!signed.has("contractor_completion") || !signed.has("manager_completion_acceptance"))) return "Contractor completion and manager completion acceptance are required before closure.";
  return "";
}

export function PermitsWorkspace({ site, templates, initialPermits }: { site: Site; templates: Template[]; initialPermits: PermitListItem[] }) {
  const [permits, setPermits] = useState(initialPermits);
  const [selectedId, setSelectedId] = useState(initialPermits[0]?.id ?? "");
  const [detail, setDetail] = useState<PermitDetail | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  const fetchPermitDetail = useCallback(async (id: string): Promise<PermitDetail> => {
    const response = await fetch(`/api/admin/permits/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load permit.");
    return data as PermitDetail;
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setError("");
    setDetail(null);
    fetchPermitDetail(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load permit.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPermitDetail, selectedId]);

  const answersByKey = useMemo(() => new Map(detail?.answers.map((answer) => [answer.questionKey, answer]) ?? []), [detail]);
  const signaturesByKey = useMemo(() => new Map(detail?.signatures.map((signature) => [signature.signatureKey, signature]) ?? []), [detail]);

  async function refreshPermits(nextSelectedId?: string) {
    const response = await fetch(`/api/admin/permits?siteId=${encodeURIComponent(site.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh permits.");
    setPermits(data.permits ?? []);
    if (nextSelectedId) setSelectedId(nextSelectedId);
  }

  async function createPermit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setDetail(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.project_id,
          templateId: String(form.get("templateId") ?? ""),
          contractor: String(form.get("contractor") ?? ""),
          locationOfWork: String(form.get("locationOfWork") ?? ""),
          descriptionOfWork: String(form.get("descriptionOfWork") ?? ""),
          validFromDate: String(form.get("validFromDate") ?? ""),
          validToDate: String(form.get("validToDate") ?? ""),
          validFromTime: String(form.get("validFromTime") ?? ""),
          validToTime: String(form.get("validToTime") ?? ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create permit.");
      await refreshPermits(data.id);
      setDetail(await fetchPermitDetail(data.id));
      event.currentTarget.reset();
      setSelectedTemplateId(templates[0]?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create permit.");
    } finally {
      setCreating(false);
    }
  }

  function updateDetail(updater: (current: PermitDetail) => PermitDetail) {
    setDetail((current) => (current ? updater(current) : current));
  }

  function setAnswer(questionKey: string, answer: PermitAnswer) {
    updateDetail((current) => {
      const next = current.answers.filter((item) => item.questionKey !== questionKey);
      return { ...current, answers: [...next, { questionKey, answer, comment: answersByKey.get(questionKey)?.comment ?? null }] };
    });
  }

  function setComment(questionKey: string, comment: string) {
    updateDetail((current) => {
      const existing = current.answers.find((item) => item.questionKey === questionKey);
      const next = current.answers.filter((item) => item.questionKey !== questionKey);
      return { ...current, answers: [...next, { questionKey, answer: existing?.answer ?? "NO", comment }] };
    });
  }

  function setSignature(signatureKey: PermitSignatureKey, patch: Partial<PermitDetail["signatures"][number]>) {
    updateDetail((current) => {
      const templateSignature = current.template.signatures.find((item) => item.key === signatureKey);
      if (!templateSignature) return current;
      const existing = current.signatures.find((item) => item.signatureKey === signatureKey) ?? blankSignature(templateSignature);
      const next = current.signatures.filter((item) => item.signatureKey !== signatureKey);
      return { ...current, signatures: [...next, { ...existing, ...patch, signedAt: patch.signedAt ?? existing.signedAt ?? new Date().toISOString() }] };
    });
  }

  async function savePermit(nextStatus?: PermitStatus) {
    if (!detail) return;
    const detailToSave = nextStatus ? { ...detail, permit: { ...detail.permit, status: nextStatus } } : detail;
    const validation = permitValidationError(detailToSave);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/permits/${detail.permit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor: detailToSave.permit.contractor,
          locationOfWork: detailToSave.permit.locationOfWork,
          descriptionOfWork: detailToSave.permit.descriptionOfWork,
          validFromDate: detailToSave.permit.validFromDate,
          validToDate: detailToSave.permit.validToDate,
          validFromTime: detailToSave.permit.validFromTime,
          validToTime: detailToSave.permit.validToTime,
          status: detailToSave.permit.status,
          answers: detailToSave.answers,
          signatures: detailToSave.signatures,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save permit.");
      await refreshPermits(detail.permit.id);
      setDetail(await fetchPermitDetail(detail.permit.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save permit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Permits</p>
        <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Create and manage structured permits for this site.</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <form onSubmit={createPermit} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">New Permit</p>
            <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedTemplate?.title ?? "Create Permit"}</h2>
            <div className="mt-4 space-y-3">
              <select
                name="templateId"
                className="min-h-11 w-full border border-zinc-300 px-3 text-sm"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.code} - {template.title}
                  </option>
                ))}
              </select>
              <input name="contractor" required placeholder="Contractor" className="min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              <input name="locationOfWork" required placeholder="Location of work" className="min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              <textarea name="descriptionOfWork" required placeholder="Description of work" className="min-h-24 w-full border border-zinc-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="validFromDate" type="date" required defaultValue={today()} className="min-h-11 border border-zinc-300 px-3 text-sm" />
                <input name="validFromTime" type="time" required defaultValue={nowTime()} className="min-h-11 border border-zinc-300 px-3 text-sm" />
                <input name="validToDate" type="date" required defaultValue={today()} className="min-h-11 border border-zinc-300 px-3 text-sm" />
                <input name="validToTime" type="time" required defaultValue="18:00" className="min-h-11 border border-zinc-300 px-3 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={creating} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {creating ? "Creating..." : "Create Permit"}
            </button>
          </form>

          <div className="border border-zinc-200 bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-slab text-2xl text-uplands-charcoal">Site Permits</h2>
              <span className="text-xs font-bold uppercase text-uplands-muted">{permits.length}</span>
            </div>
            <div className="divide-y divide-zinc-200 border border-zinc-200">
              {permits.map((permit) => (
                <button key={permit.id} type="button" onClick={() => setSelectedId(permit.id)} className={`w-full px-3 py-3 text-left ${selectedId === permit.id ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"}`}>
                  <span className="block font-din text-sm text-uplands-charcoal">{permit.permitNumber}</span>
                  <span className="mt-1 block text-sm text-zinc-700">{permit.contractor}</span>
                  <span className="mt-1 block text-xs uppercase text-uplands-muted">{statusLabel(permit.status)} - expires {permit.validToTime}</span>
                </button>
              ))}
              {permits.length === 0 && <p className="p-4 text-sm text-uplands-muted">No permits created for this site yet.</p>}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {error && <p className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {!detail && <p className="border border-zinc-200 bg-white p-5 text-sm text-uplands-muted shadow-soft">Create or select a permit.</p>}
          {detail && (
            <PermitEditor
              detail={detail}
              answersByKey={answersByKey}
              signaturesByKey={signaturesByKey}
              saving={saving}
              onDetailChange={updateDetail}
              onAnswer={setAnswer}
              onComment={setComment}
              onSignature={setSignature}
              onSave={savePermit}
              onLifecycle={savePermit}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function PermitEditor({
  detail,
  answersByKey,
  signaturesByKey,
  saving,
  onDetailChange,
  onAnswer,
  onComment,
  onSignature,
  onSave,
  onLifecycle,
}: {
  detail: PermitDetail;
  answersByKey: Map<string, PermitDetail["answers"][number]>;
  signaturesByKey: Map<PermitSignatureKey, PermitDetail["signatures"][number]>;
  saving: boolean;
  onDetailChange: (updater: (current: PermitDetail) => PermitDetail) => void;
  onAnswer: (questionKey: string, answer: PermitAnswer) => void;
  onComment: (questionKey: string, comment: string) => void;
  onSignature: (signatureKey: PermitSignatureKey, patch: Partial<PermitDetail["signatures"][number]>) => void;
  onSave: () => void;
  onLifecycle: (status: PermitStatus) => void;
}) {
  const actions = lifecycleActions(detail.permit.status);
  const actionValidation = (status: PermitStatus) => permitValidationError({ ...detail, permit: { ...detail.permit, status } });

  return (
    <div className="space-y-5">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">{detail.template.code}</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{detail.template.title}</h2>
            <p className="mt-1 text-sm font-bold text-zinc-700">{detail.permit.permitNumber}</p>
            <p className="mt-3 inline-flex border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{statusLabel(detail.permit.status)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onSave} disabled={saving} className="min-h-11 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {saving ? "Saving..." : "Save Permit"}
            </button>
            <a href={`/api/admin/permits/${detail.permit.id}/pdf`} target="_blank" className="inline-flex min-h-11 items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700">
              Print
            </a>
            <a href={`/api/admin/permits/${detail.permit.id}/pdf?download=1`} className="inline-flex min-h-11 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta">
              Download PDF
            </a>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-200 pt-5">
            {actions.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => onLifecycle(action.status)}
                disabled={saving || Boolean(actionValidation(action.status))}
                title={actionValidation(action.status) || action.label}
                className="min-h-11 border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta disabled:opacity-60"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Manual Status</span>
            <select
              value={detail.permit.status}
              onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, status: event.target.value as PermitStatus } }))}
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Contractor</span>
            <input value={detail.permit.contractor} onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, contractor: event.target.value } }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Location of Work</span>
            <input value={detail.permit.locationOfWork} onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, locationOfWork: event.target.value } }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input value={detail.permit.validFromDate} type="date" onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, validFromDate: event.target.value } }))} className="min-h-11 border border-zinc-300 px-3" />
            <input value={detail.permit.validFromTime} type="time" onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, validFromTime: event.target.value } }))} className="min-h-11 border border-zinc-300 px-3" />
            <input value={detail.permit.validToDate} type="date" onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, validToDate: event.target.value } }))} className="min-h-11 border border-zinc-300 px-3" />
            <input value={detail.permit.validToTime} type="time" onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, validToTime: event.target.value } }))} className="min-h-11 border border-zinc-300 px-3" />
          </div>
          <label className="sm:col-span-2">
            <span className="text-xs font-bold uppercase text-zinc-700">Description of Work</span>
            <textarea value={detail.permit.descriptionOfWork} onChange={(event) => onDetailChange((current) => ({ ...current, permit: { ...current.permit, descriptionOfWork: event.target.value } }))} className="mt-1 min-h-24 w-full border border-zinc-300 px-3 py-2" />
          </label>
        </div>
      </section>

      {detail.template.sections.map((section) => (
        <section key={section.id} className="border border-zinc-200 bg-white p-5 shadow-soft">
          <h3 className="font-slab text-2xl text-uplands-charcoal">{section.title}</h3>
          <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
            {section.questions.map((question) => {
              const current = answersByKey.get(question.key);
              return (
                <div key={question.key} className="p-4">
                  <p className="font-din text-base text-uplands-charcoal">{question.prompt}</p>
                  {question.helpText && <p className="mt-1 text-sm text-uplands-muted">{question.helpText}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["YES", "NO", "NA"] as PermitAnswer[]).map((answer) => (
                      <button
                        key={answer}
                        type="button"
                        onClick={() => onAnswer(question.key, answer)}
                        className={`min-h-10 border px-4 text-sm font-bold uppercase ${current?.answer === answer ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 text-zinc-700"}`}
                      >
                        {answer === "NA" ? "N/A" : answer}
                      </button>
                    ))}
                  </div>
                  <input value={current?.comment ?? ""} onChange={(event) => onComment(question.key, event.target.value)} placeholder="Comment" className="mt-3 min-h-10 w-full border border-zinc-300 px-3 text-sm" />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <h3 className="font-slab text-2xl text-uplands-charcoal">Authorisation / Signatures</h3>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {detail.template.signatures.map((signature) => {
            const current = signaturesByKey.get(signature.key) ?? blankSignature(signature);
            return (
              <article key={signature.key} className="border border-zinc-200 p-4">
                <h4 className="font-din text-lg text-uplands-charcoal">{signature.title}</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={current.name} onChange={(event) => onSignature(signature.key, { name: event.target.value })} placeholder="Name" className="min-h-10 border border-zinc-300 px-3 text-sm" />
                  <input value={current.company ?? ""} onChange={(event) => onSignature(signature.key, { company: event.target.value })} placeholder="Company" className="min-h-10 border border-zinc-300 px-3 text-sm" />
                  <input value={current.position ?? ""} onChange={(event) => onSignature(signature.key, { position: event.target.value })} placeholder="Position" className="min-h-10 border border-zinc-300 px-3 text-sm" />
                  <input value={current.signedAt.slice(0, 16)} type="datetime-local" onChange={(event) => onSignature(signature.key, { signedAt: new Date(event.target.value).toISOString() })} className="min-h-10 border border-zinc-300 px-3 text-sm" />
                </div>
                <div className="mt-3">
                  <SignaturePad value={current.signatureDataUrl} onChange={(value) => onSignature(signature.key, { signatureDataUrl: value })} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <h3 className="font-slab text-2xl text-uplands-charcoal">Audit Trail</h3>
        <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
          {detail.activity.map((event) => (
            <div key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[130px_1fr]">
              <span className="text-xs font-bold uppercase text-uplands-muted">{formatDateTime(event.occurredAt)}</span>
              <span>
                <span className="block font-din text-base text-uplands-charcoal">{event.title}</span>
                <span className="mt-1 block text-sm text-uplands-muted">{[event.detail, event.actor ? `By ${event.actor}` : ""].filter(Boolean).join(" · ")}</span>
              </span>
            </div>
          ))}
          {detail.activity.length === 0 && <p className="p-4 text-sm text-uplands-muted">No audit activity recorded yet.</p>}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={onSave} disabled={saving} className="min-h-12 bg-uplands-magenta px-6 text-sm font-bold uppercase text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save Permit"}
        </button>
      </div>
    </div>
  );
}
