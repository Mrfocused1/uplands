"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Site = { id: string; location: string; project_id: string | null; project_name: string | null };

type AttendanceOperative = {
  siteOperativeId: string;
  siteId: string;
  projectId: string | null;
  contractorId: string;
  contractorName: string;
  operativeId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  siteStatus: string;
  inductionStatus: string;
  inductionReference: string | null;
};

type AttendanceRecord = {
  id: string;
  siteId: string;
  projectId: string | null;
  contractorId: string;
  contractorName: string;
  operativeId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  inductionStatus: string;
  inductionReference: string | null;
  shift: "DAY" | "NIGHT";
  status: "SIGNED_IN" | "SIGNED_OUT";
  signedInAt: string;
  signedInBy: string | null;
  signedOutAt: string | null;
  signedOutBy: string | null;
  notes: string | null;
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function optionValue(operative: AttendanceOperative) {
  return `${operative.contractorId}:${operative.operativeId}`;
}

export function AttendanceWorkspace({
  site,
  initialRecords,
  initialOperatives,
  initialContractorFilter = "",
}: {
  site: Site;
  initialRecords: AttendanceRecord[];
  initialOperatives: AttendanceOperative[];
  initialContractorFilter?: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [operatives] = useState(initialOperatives);
  const [selectedOperative, setSelectedOperative] = useState(initialOperatives[0] ? optionValue(initialOperatives[0]) : "");
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
  const [notes, setNotes] = useState("");
  const [contractorFilter, setContractorFilter] = useState(initialContractorFilter);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentRecords = records.filter((record) => record.status === "SIGNED_IN");
  const currentOperativeIds = new Set(currentRecords.map((record) => record.operativeId));
  const availableOperatives = operatives.filter((operative) => !currentOperativeIds.has(operative.operativeId));
  const contractors = Array.from(new Map(operatives.map((operative) => [operative.contractorId, operative.contractorName])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const filteredRecords = useMemo(() => {
    const value = query.trim().toLowerCase();
    return records.filter((record) => {
      if (contractorFilter && record.contractorId !== contractorFilter) return false;
      if (!value) return true;
      return [record.fullName, record.contractorName, record.role, record.inductionReference, record.status, record.shift]
        .filter((item): item is string => Boolean(item))
        .some((item) => item.toLowerCase().includes(value));
    });
  }, [contractorFilter, query, records]);

  async function refreshAttendance() {
    const response = await fetch(`/api/admin/sites/${site.id}/attendance`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh attendance.");
    setRecords(data.records ?? []);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = availableOperatives.find((operative) => optionValue(operative) === selectedOperative);
    if (!selected) {
      setError("Select an operative to sign in.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selected.projectId ?? site.project_id,
          contractorId: selected.contractorId,
          operativeId: selected.operativeId,
          shift,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign operative in.");
      await refreshAttendance();
      setNotes("");
      const nextAvailable = availableOperatives.find((operative) => operative.operativeId !== selected.operativeId);
      setSelectedOperative(nextAvailable ? optionValue(nextAvailable) : "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign operative in.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut(attendanceId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign operative out.");
      await refreshAttendance();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign operative out.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Attendance</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Track who is currently on site against contractor and operative records.</p>
          </div>
          <Link href={`/admin/sites/${site.id}`} className="inline-flex min-h-11 w-fit items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
            Back to admin
          </Link>
        </div>
      </section>

      {error && <p className="border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form onSubmit={signIn} className="border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Sign In</p>
          <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">Operative Arrival</h2>
          <div className="mt-4 space-y-3">
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Operative</span>
              <select value={selectedOperative} onChange={(event) => setSelectedOperative(event.target.value)} required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                <option value="">Select operative</option>
                {availableOperatives.map((operative) => (
                  <option key={operative.siteOperativeId} value={optionValue(operative)}>
                    {operative.fullName} - {operative.contractorName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Shift</span>
              <select value={shift} onChange={(event) => setShift(event.target.value === "NIGHT" ? "NIGHT" : "DAY")} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-zinc-700">Notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24 w-full border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <button type="submit" disabled={saving || availableOperatives.length === 0} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
            {saving ? "Saving..." : "Sign In"}
          </button>
          {availableOperatives.length === 0 && <p className="mt-3 text-sm text-uplands-muted">All active operatives are currently signed in or no operatives are recorded for this site.</p>}
        </form>

        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Currently On Site</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{currentRecords.length} Signed In</h2>
            </div>
            <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{availableOperatives.length} available</span>
          </div>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {currentRecords.map((record) => (
              <article key={record.id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px] md:items-center">
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{record.fullName}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[record.contractorName, record.role, `${record.shift} shift`].filter(Boolean).join(" - ")}</span>
                  <span className={`mt-2 inline-flex border px-2 py-1 text-[11px] font-bold uppercase ${record.inductionStatus === "APPROVED" ? "border-zinc-300 text-zinc-700" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                    {statusLabel(record.inductionStatus)}
                  </span>
                  <span className="ml-2 inline-flex text-xs text-uplands-muted">In {formatDateTime(record.signedInAt)}</span>
                </span>
                <button type="button" onClick={() => signOut(record.id)} disabled={saving} className="min-h-10 border border-uplands-magenta px-3 text-xs font-bold uppercase text-uplands-magenta disabled:opacity-60">
                  Sign Out
                </button>
              </article>
            ))}
            {currentRecords.length === 0 && <p className="p-4 text-sm text-uplands-muted">No operatives are currently signed in.</p>}
          </div>
        </section>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Attendance History</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Site Records</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="Attendance contractor filter" value={contractorFilter} onChange={(event) => setContractorFilter(event.target.value)} className="min-h-11 border border-zinc-300 px-3 text-sm">
              <option value="">All contractors</option>
              {contractors.map(([contractorId, contractorName]) => (
                <option key={contractorId} value={contractorId}>
                  {contractorName}
                </option>
              ))}
            </select>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search attendance" className="min-h-11 border border-zinc-300 px-3 text-sm" />
          </div>
        </div>

        <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
          {filteredRecords.map((record) => (
            <article key={record.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_130px_130px_110px] lg:items-center">
              <span>
                <span className="block font-din text-lg text-uplands-charcoal">{record.fullName}</span>
                <span className="mt-1 block text-sm text-uplands-muted">{[record.contractorName, record.role, record.inductionReference].filter(Boolean).join(" - ")}</span>
              </span>
              <span className="text-sm text-uplands-muted">{formatDateTime(record.signedInAt)}</span>
              <span className="text-sm text-uplands-muted">{formatDateTime(record.signedOutAt)}</span>
              <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{statusLabel(record.status)}</span>
            </article>
          ))}
          {filteredRecords.length === 0 && <p className="p-4 text-sm text-uplands-muted">No attendance records match this view.</p>}
        </div>
      </section>
    </div>
  );
}
