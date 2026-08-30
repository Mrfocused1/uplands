"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Site = { id: string; location: string; project_id: string | null; project_name: string | null };
type Contractor = {
  siteContractorId: string;
  siteId: string;
  projectId: string | null;
  contractorId: string;
  name: string;
  contractorStatus: string;
  siteStatus: string;
  trade: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  permitCount: number;
  ramsCount: number;
  inductionCount: number;
  createdAt: string;
  updatedAt: string;
};

type ContractorFormState = {
  contractorId: string | null;
  name: string;
  trade: string;
  siteStatus: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
};

const emptyForm: ContractorFormState = {
  contractorId: null,
  name: "",
  trade: "",
  siteStatus: "ACTIVE",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
};

function contractorToForm(contractor: Contractor): ContractorFormState {
  return {
    contractorId: contractor.contractorId,
    name: contractor.name,
    trade: contractor.trade ?? "",
    siteStatus: contractor.siteStatus,
    primaryContactName: contractor.primaryContactName ?? "",
    primaryContactEmail: contractor.primaryContactEmail ?? "",
    primaryContactPhone: contractor.primaryContactPhone ?? "",
  };
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function ContractorsWorkspace({ site, initialContractors }: { site: Site; initialContractors: Contractor[] }) {
  const [contractors, setContractors] = useState(initialContractors);
  const [selectedId, setSelectedId] = useState(initialContractors[0]?.contractorId ?? "");
  const [form, setForm] = useState<ContractorFormState>(initialContractors[0] ? contractorToForm(initialContractors[0]) : emptyForm);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredContractors = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return contractors;
    return contractors.filter((contractor) => {
      const terms = [contractor.name, contractor.trade, contractor.primaryContactName, contractor.primaryContactEmail, contractor.siteStatus]
        .filter((item): item is string => Boolean(item))
        .map((item) => item.toLowerCase());
      return terms.some((term) => term.includes(value));
    });
  }, [contractors, query]);

  const selectedContractor = contractors.find((contractor) => contractor.contractorId === selectedId) ?? null;

  async function refreshContractors(nextSelectedId?: string) {
    const response = await fetch(`/api/admin/sites/${site.id}/contractors`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh contractors.");
    setContractors(data.contractors ?? []);
    if (nextSelectedId) {
      setSelectedId(nextSelectedId);
      const next = data.contractors.find((contractor: Contractor) => contractor.contractorId === nextSelectedId);
      if (next) setForm(contractorToForm(next));
    }
  }

  function selectContractor(contractor: Contractor) {
    setSelectedId(contractor.contractorId);
    setForm(contractorToForm(contractor));
    setError("");
  }

  function startNewContractor() {
    setSelectedId("");
    setForm(emptyForm);
    setError("");
  }

  async function saveContractor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Contractor name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/contractors`, {
        method: form.contractorId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: form.contractorId,
          projectId: site.project_id,
          name: form.name,
          trade: form.trade,
          siteStatus: form.siteStatus,
          primaryContactName: form.primaryContactName,
          primaryContactEmail: form.primaryContactEmail,
          primaryContactPhone: form.primaryContactPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save contractor.");
      await refreshContractors(data.contractorId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save contractor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Contractors</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Manage site contractors, contacts and linked operational records.</p>
          </div>
          <Link
            href={`/admin/sites/${site.id}`}
            className="inline-flex min-h-11 w-fit items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
          >
            Back to admin
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <form onSubmit={saveContractor} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">{form.contractorId ? "Selected Contractor" : "New Contractor"}</p>
                <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{form.name || "Contractor Details"}</h2>
              </div>
              <button type="button" onClick={startNewContractor} className="min-h-10 border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700">
                New
              </button>
            </div>

            {error && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Company Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Trade / Work Package</span>
                <input value={form.trade} onChange={(event) => setForm((current) => ({ ...current, trade: event.target.value }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Site Status</span>
                <select value={form.siteStatus} onChange={(event) => setForm((current) => ({ ...current, siteStatus: event.target.value }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Primary Contact</span>
                <input value={form.primaryContactName} onChange={(event) => setForm((current) => ({ ...current, primaryContactName: event.target.value }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Email</span>
                <input value={form.primaryContactEmail} type="email" onChange={(event) => setForm((current) => ({ ...current, primaryContactEmail: event.target.value }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Phone</span>
                <input value={form.primaryContactPhone} onChange={(event) => setForm((current) => ({ ...current, primaryContactPhone: event.target.value }))} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm" />
              </label>
            </div>

            <button type="submit" disabled={saving} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {saving ? "Saving..." : form.contractorId ? "Save Contractor" : "Add Contractor"}
            </button>
          </form>

          {selectedContractor && (
            <div className="border border-zinc-200 bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Linked Records</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric label="Permits" value={selectedContractor.permitCount} />
                <Metric label="RAMS" value={selectedContractor.ramsCount} />
                <Metric label="Inductions" value={selectedContractor.inductionCount} />
              </div>
            </div>
          )}
        </div>

        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Site Register</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Contractors</h2>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contractors" className="min-h-11 w-full border border-zinc-300 px-3 text-sm sm:w-72" />
          </div>

          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {filteredContractors.map((contractor) => (
              <button
                key={contractor.contractorId}
                type="button"
                onClick={() => selectContractor(contractor)}
                className={`grid w-full gap-4 p-4 text-left transition md:grid-cols-[1fr_120px_120px_120px] md:items-center ${
                  selectedId === contractor.contractorId ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"
                }`}
              >
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{contractor.name}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[contractor.trade, contractor.primaryContactName, contractor.primaryContactEmail].filter(Boolean).join(" · ") || "No contact details recorded"}</span>
                  <span className="mt-2 inline-flex border border-zinc-300 px-2 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(contractor.siteStatus)}</span>
                </span>
                <span className="text-sm text-uplands-muted">
                  <span className="block text-xs font-bold uppercase">Permits</span>
                  <span className="font-slab text-2xl text-uplands-charcoal">{contractor.permitCount}</span>
                </span>
                <span className="text-sm text-uplands-muted">
                  <span className="block text-xs font-bold uppercase">RAMS</span>
                  <span className="font-slab text-2xl text-uplands-charcoal">{contractor.ramsCount}</span>
                </span>
                <span className="text-sm text-uplands-muted">
                  <span className="block text-xs font-bold uppercase">Inductions</span>
                  <span className="font-slab text-2xl text-uplands-charcoal">{contractor.inductionCount}</span>
                </span>
              </button>
            ))}
            {filteredContractors.length === 0 && <p className="p-5 text-sm text-uplands-muted">No contractors match this search.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-200 bg-uplands-paper p-3">
      <p className="text-xs font-bold uppercase text-uplands-muted">{label}</p>
      <p className="mt-1 font-slab text-3xl text-uplands-charcoal">{value}</p>
    </div>
  );
}
