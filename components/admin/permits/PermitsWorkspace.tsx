"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SignaturePad } from "@/components/induction/SignaturePad";
import type { PermitAnswer, PermitSignatureKey, PermitStatus, PermitTemplateFieldType } from "@/config/permitTemplates";
import { isPermitAnswer, lifecycleActions, PERMIT_STATUSES, validatePermitUpdate } from "@/lib/permits/lifecycle";

type Site = { id: string; location: string; project_id: string | null; project_name: string | null };
type Template = { id: string; code: string; title: string; description: string };
type Contractor = { contractorId: string; name: string; siteStatus: string; trade: string | null };
type ContractorFilter = { contractorId: string; name: string };
type RamsDocumentOption = {
  id: string;
  title: string;
  contractorId: string | null;
  contractor: string;
  documentReference: string | null;
  revision: string | null;
  processingStatus: string;
};
type PermitListItem = {
  id: string;
  permitNumber: string;
  contractorId: string | null;
  ramsDocumentId: string | null;
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
    contractorId: string | null;
    ramsDocumentId: string | null;
    ramsDocumentTitle: string | null;
    ramsDocumentReference: string | null;
    ramsDocumentRevision: string | null;
  };
  template: {
    code: string;
    title: string;
    signatures: Array<{ key: PermitSignatureKey; title: string; role: string; action: string }>;
    fields: Array<{
      key: string;
      label: string;
      helpText: string | null;
      type: PermitTemplateFieldType;
      required: boolean;
      options: string[];
      placeholder: string | null;
      sortOrder: number;
    }>;
    sections: Array<{
      id: string;
      title: string;
      description: string | null;
      questions: Array<{ key: string; prompt: string; helpText: string | null; requiresCommentOn: string[] }>;
    }>;
  };
  fieldValues: Array<{ fieldKey: string; value: string | null }>;
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

function ramsLabel(document: RamsDocumentOption) {
  return [document.title, document.documentReference, document.revision ? `Rev ${document.revision}` : ""].filter(Boolean).join(" - ");
}

function ramsMatchesContractor(document: RamsDocumentOption, contractorId: string | null | undefined, contractorName: string | null | undefined) {
  if (!document.contractorId && !document.contractor) return true;
  if (contractorId && document.contractorId === contractorId) return true;
  return Boolean(contractorName && document.contractor.trim().toLowerCase() === contractorName.trim().toLowerCase());
}

function sortRamsDocuments(documents: RamsDocumentOption[]) {
  return [...documents].sort((a, b) => {
    if (a.processingStatus === "READY" && b.processingStatus !== "READY") return -1;
    if (a.processingStatus !== "READY" && b.processingStatus === "READY") return 1;
    return a.title.localeCompare(b.title);
  });
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

function permitValidationError(current: PermitDetail, currentStatus: PermitStatus = current.permit.status) {
  return validatePermitUpdate({
    currentStatus,
    nextStatus: current.permit.status,
    contractor: current.permit.contractor,
    fields: current.template.fields.map((field) => ({ key: field.key, label: field.label, required: field.required })),
    fieldValues: current.fieldValues,
      questions: current.template.sections.flatMap((section) =>
        section.questions.map((question) => ({
          ...question,
          requiresCommentOn: question.requiresCommentOn.filter(isPermitAnswer),
        })),
      ),
    answers: current.answers,
    signatures: current.signatures,
  });
}

export function PermitsWorkspace({
  site,
  templates,
  contractors: initialContractors,
  ramsDocuments,
  initialPermits,
  initialSelectedPermitId = null,
  contractorFilter = null,
}: {
  site: Site;
  templates: Template[];
  contractors: Contractor[];
  ramsDocuments: RamsDocumentOption[];
  initialPermits: PermitListItem[];
  initialSelectedPermitId?: string | null;
  contractorFilter?: ContractorFilter | null;
}) {
  const initialVisiblePermits = contractorFilter
    ? initialPermits.filter((permit) => permit.contractorId === contractorFilter.contractorId || permit.contractor === contractorFilter.name)
    : initialPermits;
  const initialSelectedVisiblePermit = initialVisiblePermits.some((permit) => permit.id === initialSelectedPermitId) ? initialSelectedPermitId : initialVisiblePermits[0]?.id ?? "";
  const [permits, setPermits] = useState(initialPermits);
  const [contractors, setContractors] = useState(initialContractors);
  const [selectedId, setSelectedId] = useState(initialSelectedVisiblePermit);
  const [detail, setDetail] = useState<PermitDetail | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [newPermitContractorId, setNewPermitContractorId] = useState(contractorFilter?.contractorId ?? "__new__");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const selectedNewContractor = contractors.find((contractor) => contractor.contractorId === newPermitContractorId);
  const newPermitRamsOptions = useMemo(
    () => sortRamsDocuments(ramsDocuments.filter((document) => newPermitContractorId === "__new__" || ramsMatchesContractor(document, selectedNewContractor?.contractorId, selectedNewContractor?.name))),
    [newPermitContractorId, ramsDocuments, selectedNewContractor?.contractorId, selectedNewContractor?.name],
  );
  const visiblePermits = useMemo(
    () => (contractorFilter ? permits.filter((permit) => permit.contractorId === contractorFilter.contractorId || permit.contractor === contractorFilter.name) : permits),
    [contractorFilter, permits],
  );

  useEffect(() => {
    if (selectedId && visiblePermits.some((permit) => permit.id === selectedId)) return;
    setSelectedId(visiblePermits[0]?.id ?? "");
  }, [selectedId, visiblePermits]);

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
  const fieldValuesByKey = useMemo(() => new Map(detail?.fieldValues.map((fieldValue) => [fieldValue.fieldKey, fieldValue.value ?? ""]) ?? []), [detail]);
  const signaturesByKey = useMemo(() => new Map(detail?.signatures.map((signature) => [signature.signatureKey, signature]) ?? []), [detail]);

  async function refreshPermits(nextSelectedId?: string) {
    const response = await fetch(`/api/admin/permits?siteId=${encodeURIComponent(site.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh permits.");
    setPermits(data.permits ?? []);
    if (nextSelectedId) setSelectedId(nextSelectedId);
  }

  async function refreshContractors() {
    const response = await fetch(`/api/admin/sites/${site.id}/contractors`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh contractors.");
    setContractors(data.contractors ?? []);
  }

  async function createPermit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setDetail(null);
    const form = new FormData(event.currentTarget);
    const selectedContractor = contractors.find((contractor) => contractor.contractorId === newPermitContractorId);
    const contractor = selectedContractor?.name ?? String(form.get("contractor") ?? "");
    try {
      const response = await fetch("/api/admin/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.project_id,
          templateId: String(form.get("templateId") ?? ""),
          contractorId: selectedContractor?.contractorId ?? "",
          ramsDocumentId: String(form.get("ramsDocumentId") ?? ""),
          contractor,
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
      await refreshContractors();
      await refreshPermits(data.id);
      event.currentTarget.reset();
      setSelectedTemplateId(templates[0]?.id ?? "");
      setNewPermitContractorId(contractorFilter?.contractorId ?? "__new__");
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

  function setFieldValue(fieldKey: string, value: string) {
    updateDetail((current) => {
      const next = current.fieldValues.filter((item) => item.fieldKey !== fieldKey);
      return { ...current, fieldValues: [...next, { fieldKey, value }] };
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
    const validation = permitValidationError(detailToSave, detail.permit.status);
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
          contractorId: detailToSave.permit.contractorId ?? "",
          locationOfWork: detailToSave.permit.locationOfWork,
          descriptionOfWork: detailToSave.permit.descriptionOfWork,
          validFromDate: detailToSave.permit.validFromDate,
          validToDate: detailToSave.permit.validToDate,
          validFromTime: detailToSave.permit.validFromTime,
          validToTime: detailToSave.permit.validToTime,
          ramsDocumentId: detailToSave.permit.ramsDocumentId ?? "",
          status: detailToSave.permit.status,
          fieldValues: detailToSave.fieldValues,
          answers: detailToSave.answers,
          signatures: detailToSave.signatures,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save permit.");
      await refreshContractors();
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Permits</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
              {contractorFilter ? `Create and manage structured permits for ${contractorFilter.name}.` : "Create and manage structured permits for this site."}
            </p>
          </div>
          <Link
            href={`/admin/sites/${site.id}`}
            className="inline-flex min-h-11 w-fit items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
          >
            Back to admin
          </Link>
        </div>
      </section>

      {contractorFilter && (
        <section className="flex flex-col gap-3 border border-uplands-magenta/30 bg-uplands-paper p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-uplands-charcoal">Showing permits for {contractorFilter.name}.</p>
          <Link href={`/admin/sites/${site.id}/permits`} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
            Clear filter
          </Link>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <form onSubmit={createPermit} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">New Permit</p>
            <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedTemplate?.title ?? "Create Permit"}</h2>
            <div className="mt-4 space-y-3">
              <input type="hidden" name="templateId" value={selectedTemplateId} />
              <fieldset>
                <legend className="text-xs font-bold uppercase text-zinc-700">Permit Type</legend>
                <div className="mt-2 grid gap-2">
                  {templates.map((template) => {
                    const isSelected = template.id === selectedTemplateId;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`min-h-24 border p-3 text-left transition ${
                          isSelected ? "border-uplands-magenta bg-uplands-paper shadow-soft" : "border-zinc-200 bg-white hover:border-uplands-magenta/60"
                        }`}
                      >
                        <span className="block font-din text-sm font-bold text-uplands-magenta">{template.code}</span>
                        <span className="mt-1 block font-din text-base text-uplands-charcoal">{template.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-uplands-muted">{template.description}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label>
                <span className="text-xs font-bold uppercase text-zinc-700">Contractor</span>
                <select value={newPermitContractorId} onChange={(event) => setNewPermitContractorId(event.target.value)} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                  <option value="__new__">Add new contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.contractorId} value={contractor.contractorId}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </label>
              {newPermitContractorId === "__new__" && <input name="contractor" required placeholder="New contractor name" className="min-h-11 w-full border border-zinc-300 px-3 text-sm" />}
              <label>
                <span className="text-xs font-bold uppercase text-zinc-700">Linked RAMS</span>
                <select name="ramsDocumentId" className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                  <option value="">No linked RAMS yet</option>
                  {newPermitRamsOptions.map((document) => (
                    <option key={document.id} value={document.id}>
                      {ramsLabel(document)}
                      {document.processingStatus !== "READY" ? ` (${document.processingStatus.replaceAll("_", " ")})` : ""}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs leading-5 text-uplands-muted">Select the RAMS this permit is working under when it is available.</span>
              </label>
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
              <h2 className="font-slab text-2xl text-uplands-charcoal">{contractorFilter ? "Contractor Permits" : "Site Permits"}</h2>
              <span className="text-xs font-bold uppercase text-uplands-muted">{visiblePermits.length}</span>
            </div>
            <div className="divide-y divide-zinc-200 border border-zinc-200">
              {visiblePermits.map((permit) => (
                <button key={permit.id} type="button" onClick={() => setSelectedId(permit.id)} className={`w-full px-3 py-3 text-left ${selectedId === permit.id ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"}`}>
                  <span className="block font-din text-sm text-uplands-charcoal">{permit.permitNumber}</span>
                  <span className="mt-1 block text-sm text-zinc-700">{permit.contractor}</span>
                  <span className="mt-1 block text-xs uppercase text-uplands-muted">{statusLabel(permit.status)} - expires {permit.validToTime}</span>
                  {!permit.ramsDocumentId && <span className="mt-2 inline-flex border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold uppercase text-amber-800">Missing linked RAMS</span>}
                </button>
              ))}
              {visiblePermits.length === 0 && <p className="p-4 text-sm text-uplands-muted">{contractorFilter ? "No permits recorded for this contractor yet." : "No permits created for this site yet."}</p>}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {error && <p className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {!detail && <p className="border border-zinc-200 bg-white p-5 text-sm text-uplands-muted shadow-soft">Create or select a permit.</p>}
          {detail && (
            <PermitEditor
              detail={detail}
              contractors={contractors}
              ramsDocuments={ramsDocuments}
              answersByKey={answersByKey}
              fieldValuesByKey={fieldValuesByKey}
              signaturesByKey={signaturesByKey}
              saving={saving}
              onDetailChange={updateDetail}
              onFieldValue={setFieldValue}
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

function PermitFieldInput({
  field,
  value,
  onChange,
}: {
  field: PermitDetail["template"]["fields"][number];
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <span className="text-xs font-bold uppercase text-zinc-700">
      {field.label}
      {field.required ? " *" : ""}
    </span>
  );
  const commonClass = "mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm";

  if (field.type === "TEXTAREA") {
    return (
      <label className="sm:col-span-2">
        {label}
        <textarea value={value} required={field.required} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder ?? ""} className={`${commonClass} min-h-24 py-2`} />
        {field.helpText && <span className="mt-1 block text-xs leading-5 text-uplands-muted">{field.helpText}</span>}
      </label>
    );
  }

  if (field.type === "SELECT") {
    return (
      <label>
        {label}
        <select value={value} required={field.required} onChange={(event) => onChange(event.target.value)} className={commonClass}>
          <option value="">Select...</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {field.helpText && <span className="mt-1 block text-xs leading-5 text-uplands-muted">{field.helpText}</span>}
      </label>
    );
  }

  const inputType = field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : field.type === "TIME" ? "time" : "text";
  return (
    <label>
      {label}
      <input value={value} type={inputType} required={field.required} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder ?? ""} className={commonClass} />
      {field.helpText && <span className="mt-1 block text-xs leading-5 text-uplands-muted">{field.helpText}</span>}
    </label>
  );
}

function PermitEditor({
  detail,
  contractors,
  ramsDocuments,
  answersByKey,
  fieldValuesByKey,
  signaturesByKey,
  saving,
  onDetailChange,
  onFieldValue,
  onAnswer,
  onComment,
  onSignature,
  onSave,
  onLifecycle,
}: {
  detail: PermitDetail;
  contractors: Contractor[];
  ramsDocuments: RamsDocumentOption[];
  answersByKey: Map<string, PermitDetail["answers"][number]>;
  fieldValuesByKey: Map<string, string>;
  signaturesByKey: Map<PermitSignatureKey, PermitDetail["signatures"][number]>;
  saving: boolean;
  onDetailChange: (updater: (current: PermitDetail) => PermitDetail) => void;
  onFieldValue: (fieldKey: string, value: string) => void;
  onAnswer: (questionKey: string, answer: PermitAnswer) => void;
  onComment: (questionKey: string, comment: string) => void;
  onSignature: (signatureKey: PermitSignatureKey, patch: Partial<PermitDetail["signatures"][number]>) => void;
  onSave: () => void;
  onLifecycle: (status: PermitStatus) => void;
}) {
  const actions = lifecycleActions(detail.permit.status);
  const actionValidation = (status: PermitStatus) => permitValidationError({ ...detail, permit: { ...detail.permit, status } }, detail.permit.status);
  const selectedContractorId = contractors.some((contractor) => contractor.contractorId === detail.permit.contractorId) ? detail.permit.contractorId : "__new__";
  const ramsOptions = sortRamsDocuments(
    ramsDocuments.filter((document) => document.id === detail.permit.ramsDocumentId || ramsMatchesContractor(document, detail.permit.contractorId, detail.permit.contractor)),
  );
  const linkedRamsSummary = [detail.permit.ramsDocumentTitle, detail.permit.ramsDocumentReference, detail.permit.ramsDocumentRevision ? `Rev ${detail.permit.ramsDocumentRevision}` : ""]
    .filter(Boolean)
    .join(" - ");

  return (
    <div className="space-y-5" data-testid="permit-editor">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">{detail.template.code}</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{detail.template.title}</h2>
            <p className="mt-1 text-sm font-bold text-zinc-700">{detail.permit.permitNumber}</p>
            <p className="mt-3 inline-flex border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{statusLabel(detail.permit.status)}</p>
            {!detail.permit.ramsDocumentId && <p className="mt-2 inline-flex border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase text-amber-800">Missing linked RAMS</p>}
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
              {PERMIT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Contractor</span>
            <select
              value={selectedContractorId ?? "__new__"}
              onChange={(event) => {
                const contractor = contractors.find((item) => item.contractorId === event.target.value);
                onDetailChange((current) => ({
                  ...current,
                  permit: {
                    ...current.permit,
                    contractorId: contractor?.contractorId ?? null,
                    contractor: contractor?.name ?? "",
                    ramsDocumentId: null,
                    ramsDocumentTitle: null,
                    ramsDocumentReference: null,
                    ramsDocumentRevision: null,
                  },
                }));
              }}
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3"
            >
              <option value="__new__">Add new contractor</option>
              {contractors.map((contractor) => (
                <option key={contractor.contractorId} value={contractor.contractorId}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </label>
          {selectedContractorId === "__new__" && (
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">New Contractor Name</span>
              <input
                value={detail.permit.contractor}
                onChange={(event) =>
                  onDetailChange((current) => ({
                    ...current,
                    permit: {
                      ...current.permit,
                      contractor: event.target.value,
                      contractorId: null,
                      ramsDocumentId: null,
                      ramsDocumentTitle: null,
                      ramsDocumentReference: null,
                      ramsDocumentRevision: null,
                    },
                  }))
                }
                className="mt-1 min-h-11 w-full border border-zinc-300 px-3"
              />
            </label>
          )}
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Linked RAMS</span>
            <select
              value={detail.permit.ramsDocumentId ?? ""}
              onChange={(event) => {
                const document = ramsDocuments.find((item) => item.id === event.target.value);
                onDetailChange((current) => ({
                  ...current,
                  permit: {
                    ...current.permit,
                    ramsDocumentId: document?.id ?? null,
                    ramsDocumentTitle: document?.title ?? null,
                    ramsDocumentReference: document?.documentReference ?? null,
                    ramsDocumentRevision: document?.revision ?? null,
                  },
                }));
              }}
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3"
            >
              <option value="">No linked RAMS yet</option>
              {ramsOptions.map((document) => (
                <option key={document.id} value={document.id}>
                  {ramsLabel(document)}
                  {document.processingStatus !== "READY" ? ` (${document.processingStatus.replaceAll("_", " ")})` : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs leading-5 text-uplands-muted">{linkedRamsSummary || "Choose the approved RAMS this permit is working under when available."}</span>
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

      {detail.template.fields.length > 0 && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <h3 className="font-slab text-2xl text-uplands-charcoal">Permit Specific Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.template.fields.map((field) => (
              <PermitFieldInput key={field.key} field={field} value={fieldValuesByKey.get(field.key) ?? ""} onChange={(value) => onFieldValue(field.key, value)} />
            ))}
          </div>
        </section>
      )}

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
