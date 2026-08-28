"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FORM_EDIT_SECTIONS, type FormEditorField, type FormFieldKey } from "@/lib/admin/formEditor";
import { viewPdf } from "@/lib/admin/pdfActions";
import { Spinner } from "@/components/Spinner";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

type FormValue = string | boolean | null;

interface SubmissionData {
  id: string;
  fullName: string | null;
  reference: string | null;
  printData: UHSF1601PrintData;
}

function valueFromPrintData(printData: UHSF1601PrintData): Record<string, FormValue> {
  const result: Record<string, FormValue> = {};
  for (const field of FORM_EDIT_SECTIONS.flatMap((section) => section.fields)) {
    result[field.key] = printData[field.key] ?? null;
  }
  return result;
}

function signatureUrl(value: string | null | undefined) {
  return value && value.startsWith("data:image/") ? value : null;
}

export function FormEditor({ id }: { id: string }) {
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [values, setValues] = useState<Record<string, FormValue>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/submissions/${id}`);
      if (!response.ok) throw new Error("not found");
      const body = await response.json();
      const submissionData = body.submission as SubmissionData;
      setSubmission(submissionData);
      setValues(valueFromPrintData(submissionData.printData));
    } catch {
      setError("Unable to load this submission.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function setField(key: FormFieldKey, value: FormValue) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!submission) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printData: values }),
      });
      if (!response.ok) throw new Error("failed");
      setToast("Form saved");
      await load();
    } catch {
      setError("Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function viewPdfHandler() {
    setViewing(true);
    setError("");
    try {
      await viewPdf(`/api/admin/submissions/${id}/pdf`);
    } catch {
      setError("Unable to prepare the PDF.");
    } finally {
      setViewing(false);
    }
  }

  if (error && !submission) {
    return <div className="border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-soft">{error}</div>;
  }

  if (!submission) {
    return <div className="py-16 text-center text-zinc-500">Loading editor…</div>;
  }

  const inducteeSignature = signatureUrl(submission.printData.inducteeSignature);
  const inductorSignature = signatureUrl(submission.printData.inductorSignature);

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        <Link href="/admin/forms" className="text-sm font-bold uppercase tracking-wide text-zinc-600 hover:text-uplands-magenta">
          Back to Forms Workspace
        </Link>
        <Link href={`/admin/submissions/${id}`} className="text-sm font-bold uppercase tracking-wide text-zinc-600 hover:text-uplands-magenta">
          Back to submission
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-5 border-b border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Form data</p>
          <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">Edit form</h1>
          <p className="mt-2 text-sm text-uplands-muted">{submission.fullName || "Unknown inductee"} · {submission.reference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={viewPdfHandler}
            disabled={viewing}
            className="inline-flex items-center gap-2 border border-zinc-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-60"
          >
            {viewing && <Spinner />}
            {viewing ? "Opening..." : "View PDF"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-uplands-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#8e0075] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {error && submission && (
        <p className="mt-5 border-l-4 border-red-300 bg-white p-4 text-sm font-bold text-red-700 shadow-soft" role="status">{error}</p>
      )}

      <div className="mt-6 grid gap-6">
        {FORM_EDIT_SECTIONS.map((section) => (
          <div key={section.title} className="overflow-hidden border border-zinc-200 bg-white shadow-soft">
            <h2 className="border-b border-zinc-100 bg-uplands-charcoal px-5 py-3 text-sm font-bold uppercase tracking-wide text-white">
              {section.title}
            </h2>
            <div className="divide-y divide-zinc-100">
              {section.fields.map((field) => (
                <FormFieldRow
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? null}
                  onChange={(value) => setField(field.key, value)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-6 sm:grid-cols-2">
          <SignatureBlock label="Inductee signature" value={inducteeSignature} />
          <SignatureBlock label="Inductor signature" value={inductorSignature} />
        </div>
      </div>

      <div className="mt-6 border border-zinc-200 bg-white p-5 text-xs text-zinc-500 shadow-soft">
        <p><strong className="text-zinc-700">Note:</strong> Signatures and uploaded documents are managed separately and cannot be edited here. Changes update the printable record.</p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-uplands-charcoal px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function FormFieldRow({ field, value, onChange }: { field: FormEditorField; value: FormValue; onChange: (value: FormValue) => void }) {
  const labelId = `field-${field.key}`;
  const inputClass =
    "w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/20";

  return (
    <div className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-3 sm:items-center">
      <label htmlFor={labelId} className="text-sm text-zinc-500">{field.label}</label>
      <div className="sm:col-span-2">
        {field.kind === "textarea" ? (
          <textarea
            id={labelId}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        ) : field.kind === "date" ? (
          <input
            id={labelId}
            type="date"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
            className={inputClass}
          />
        ) : field.kind === "text" ? (
          <input
            id={labelId}
            type="text"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            className={inputClass}
          />
        ) : (
          <select
            id={labelId}
            value={value === null ? "" : value ? "true" : "false"}
            onChange={(event) => {
              const next = event.target.value;
              onChange(next === "" ? null : next === "true");
            }}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="true">{field.trueLabel ?? "Yes"}</option>
            <option value="false">{field.falseLabel ?? "No"}</option>
          </select>
        )}
      </div>
    </div>
  );
}

function SignatureBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="overflow-hidden border border-zinc-200 bg-white shadow-soft">
      <h2 className="border-b border-zinc-100 bg-uplands-charcoal px-5 py-3 text-sm font-bold uppercase tracking-wide text-white">{label}</h2>
      <div className="p-5">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="max-h-28 border border-zinc-200 bg-white" />
        ) : (
          <p className="text-sm text-zinc-400">Not signed</p>
        )}
      </div>
    </div>
  );
}
