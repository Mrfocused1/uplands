"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Site = { id: string; location: string; project_id: string | null; project_name: string | null };
type HandoverStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "ARCHIVED";
type HandoverShift = "DAY" | "NIGHT";

type HandoverRecord = {
  id: string;
  siteId: string;
  projectId: string | null;
  handoverDate: string;
  shift: HandoverShift;
  status: HandoverStatus;
  managerName: string | null;
  summary: string | null;
  workCompleted: string | null;
  contractorsPresent: string | null;
  permitsSummary: string | null;
  issues: string | null;
  deliveries: string | null;
  outstandingActions: string | null;
  nextShiftNotes: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type HandoverPrefill = {
  summary: string;
  contractorsPresent: string;
  permitsSummary: string;
  outstandingActions: string;
};

type FormState = {
  handoverId: string | null;
  handoverDate: string;
  shift: HandoverShift;
  managerName: string;
  summary: string;
  workCompleted: string;
  contractorsPresent: string;
  permitsSummary: string;
  issues: string;
  deliveries: string;
  outstandingActions: string;
  nextShiftNotes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  handoverId: null,
  handoverDate: today,
  shift: "DAY",
  managerName: "",
  summary: "",
  workCompleted: "",
  contractorsPresent: "",
  permitsSummary: "",
  issues: "",
  deliveries: "",
  outstandingActions: "",
  nextShiftNotes: "",
};

function recordToForm(record: HandoverRecord): FormState {
  return {
    handoverId: record.id,
    handoverDate: record.handoverDate,
    shift: record.shift,
    managerName: record.managerName ?? "",
    summary: record.summary ?? "",
    workCompleted: record.workCompleted ?? "",
    contractorsPresent: record.contractorsPresent ?? "",
    permitsSummary: record.permitsSummary ?? "",
    issues: record.issues ?? "",
    deliveries: record.deliveries ?? "",
    outstandingActions: record.outstandingActions ?? "",
    nextShiftNotes: record.nextShiftNotes ?? "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusClasses(status: HandoverStatus) {
  if (status === "ACKNOWLEDGED") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "SUBMITTED") return "border-uplands-magenta bg-white text-uplands-magenta";
  return "border-zinc-300 bg-white text-zinc-700";
}

export function HandoverWorkspace({ site, initialHandovers, prefill }: { site: Site; initialHandovers: HandoverRecord[]; prefill: HandoverPrefill }) {
  const [records, setRecords] = useState(initialHandovers);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const latestOppositeShift = useMemo(() => {
    const opposite = form.shift === "DAY" ? "NIGHT" : "DAY";
    return records.find((record) => record.shift === opposite && record.status !== "DRAFT") ?? null;
  }, [form.shift, records]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function useSiteSnapshot() {
    setForm((current) => ({
      ...current,
      summary: current.summary || prefill.summary,
      contractorsPresent: current.contractorsPresent || prefill.contractorsPresent,
      permitsSummary: current.permitsSummary || prefill.permitsSummary,
      outstandingActions: current.outstandingActions || prefill.outstandingActions,
    }));
    setMessage("Site snapshot added");
  }

  async function save(status: HandoverStatus) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const method = form.handoverId ? "PATCH" : "POST";
      const response = await fetch(`/api/admin/sites/${site.id}/handovers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          handoverId: form.handoverId,
          projectId: site.project_id,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save handover.");
      const handovers = (data.handovers ?? []) as HandoverRecord[];
      setRecords(handovers);
      const savedId = form.handoverId ?? data.id;
      const savedRecord = handovers.find((record) => record.id === savedId);
      if (savedRecord) setForm(recordToForm(savedRecord));
      setMessage(status === "DRAFT" ? "Draft saved" : status === "ACKNOWLEDGED" ? "Handover acknowledged" : "Handover submitted");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save handover.");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save("DRAFT");
  }

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Handover</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Record shift activity, outstanding actions and notes for the next site manager.</p>
          </div>
          <Link href={`/admin/sites/${site.id}`} className="inline-flex min-h-11 w-fit items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
            Back to admin
          </Link>
        </div>
      </section>

      {latestOppositeShift && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Previous {latestOppositeShift.shift.toLowerCase()} Shift</p>
          <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{latestOppositeShift.managerName || "Manager"} · {formatDate(latestOppositeShift.handoverDate)}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{latestOppositeShift.summary || latestOppositeShift.nextShiftNotes || "No summary recorded."}</p>
        </section>
      )}

      {(message || error) && (
        <p className={`border-l-4 p-3 text-sm font-bold ${error ? "border-red-600 bg-red-50 text-red-700" : "border-emerald-600 bg-emerald-50 text-emerald-800"}`}>
          {error || message}
        </p>
      )}

      <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Shift Record</p>
          <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{form.handoverId ? "Edit Handover" : "New Handover"}</h2>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={useSiteSnapshot} className="min-h-10 w-fit border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
              Use Site Snapshot
            </button>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Date</span>
              <input type="date" value={form.handoverDate} onChange={(event) => updateField("handoverDate", event.target.value)} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Shift</span>
              <select value={form.shift} onChange={(event) => updateField("shift", event.target.value === "NIGHT" ? "NIGHT" : "DAY")} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Site Manager</span>
              <input value={form.managerName} onChange={(event) => updateField("managerName", event.target.value)} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Summary</span>
              <textarea value={form.summary} onChange={(event) => updateField("summary", event.target.value)} className="mt-1 min-h-20 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Work Completed</span>
              <textarea value={form.workCompleted} onChange={(event) => updateField("workCompleted", event.target.value)} className="mt-1 min-h-24 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Contractors Present</span>
              <textarea value={form.contractorsPresent} onChange={(event) => updateField("contractorsPresent", event.target.value)} className="mt-1 min-h-20 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Active Permits</span>
              <textarea value={form.permitsSummary} onChange={(event) => updateField("permitsSummary", event.target.value)} className="mt-1 min-h-20 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Issues / Actions</span>
              <textarea value={form.outstandingActions} onChange={(event) => updateField("outstandingActions", event.target.value)} className="mt-1 min-h-24 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Deliveries</span>
              <textarea value={form.deliveries} onChange={(event) => updateField("deliveries", event.target.value)} className="mt-1 min-h-20 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Notes</span>
              <textarea value={form.nextShiftNotes} onChange={(event) => updateField("nextShiftNotes", event.target.value)} className="mt-1 min-h-24 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="submit" disabled={saving} className="min-h-11 border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta disabled:opacity-60">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={() => save("SUBMITTED")} disabled={saving} className="min-h-11 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              Submit Handover
            </button>
          </div>
          {form.handoverId && (
            <button type="button" onClick={() => save("ACKNOWLEDGED")} disabled={saving} className="mt-3 min-h-11 w-full bg-uplands-charcoal px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              Acknowledge Handover
            </button>
          )}
        </form>

        <section aria-label="Handover History" className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Shift Records</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Handover History</h2>
            </div>
            <button type="button" onClick={() => setForm(emptyForm)} className="min-h-10 w-fit border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
              New Record
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {records.map((record) => (
              <article key={record.id} className="border border-zinc-200 bg-uplands-paper p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <span>
                    <span className="block text-xs font-bold uppercase text-uplands-muted">{formatDate(record.handoverDate)} · {record.shift}</span>
                    <span className="mt-1 block font-din text-lg text-uplands-charcoal">{record.managerName || "No manager recorded"}</span>
                  </span>
                  <span className={`w-fit border px-2.5 py-1 text-xs font-bold uppercase ${statusClasses(record.status)}`}>{record.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{record.workCompleted || record.summary || "No work summary recorded."}</p>
                {record.outstandingActions && <p className="mt-3 whitespace-pre-wrap border-l-4 border-amber-400 bg-white p-3 text-sm font-bold text-amber-900">{record.outstandingActions}</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setForm(recordToForm(record))} className="min-h-10 border border-uplands-magenta px-3 text-xs font-bold uppercase text-uplands-magenta">
                    Edit
                  </button>
                  <span className="self-center text-xs font-bold uppercase text-uplands-muted">Updated {formatDateTime(record.updatedAt)}</span>
                </div>
              </article>
            ))}
            {records.length === 0 && <p className="border border-zinc-200 p-4 text-sm text-uplands-muted">No handover records have been created for this site yet.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}
