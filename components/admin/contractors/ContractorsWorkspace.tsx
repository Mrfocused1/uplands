"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  operativeCount: number;
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

type Operative = {
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
  cscsCardNumber: string | null;
  cscsExpiry: string | null;
  operativeStatus: string;
  siteStatus: string;
  inductionStatus: string;
  inductionSubmissionId: string | null;
  inductionReference: string | null;
  createdAt: string;
  updatedAt: string;
};

type OperativeFormState = {
  operativeId: string | null;
  fullName: string;
  role: string;
  siteStatus: string;
  inductionStatus: string;
  email: string;
  phone: string;
  cscsCardNumber: string;
  cscsExpiry: string;
};

type InductionInvitation = {
  id: string;
  siteId: string;
  projectId: string | null;
  contractorId: string;
  operativeId: string | null;
  submissionId: string | null;
  invitedFullName: string | null;
  invitedEmail: string | null;
  invitedPhone: string | null;
  role: string | null;
  status: string;
  expiresAt: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  usedAt: string | null;
  revokedAt: string | null;
};

type InvitationFormState = {
  invitedFullName: string;
  invitedEmail: string;
  invitedPhone: string;
  role: string;
  expiresAt: string;
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

const emptyOperativeForm: OperativeFormState = {
  operativeId: null,
  fullName: "",
  role: "",
  siteStatus: "ACTIVE",
  inductionStatus: "NOT_STARTED",
  email: "",
  phone: "",
  cscsCardNumber: "",
  cscsExpiry: "",
};

function defaultInvitationForm(): InvitationFormState {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return {
    invitedFullName: "",
    invitedEmail: "",
    invitedPhone: "",
    role: "",
    expiresAt: date.toISOString().slice(0, 10),
  };
}

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

function operativeToForm(operative: Operative): OperativeFormState {
  return {
    operativeId: operative.operativeId,
    fullName: operative.fullName,
    role: operative.role ?? "",
    siteStatus: operative.siteStatus,
    inductionStatus: operative.inductionStatus,
    email: operative.email ?? "",
    phone: operative.phone ?? "",
    cscsCardNumber: operative.cscsCardNumber ?? "",
    cscsExpiry: operative.cscsExpiry ?? "",
  };
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function ContractorsWorkspace({ site, initialContractors }: { site: Site; initialContractors: Contractor[] }) {
  const [contractors, setContractors] = useState(initialContractors);
  const [selectedId, setSelectedId] = useState(initialContractors[0]?.contractorId ?? "");
  const [form, setForm] = useState<ContractorFormState>(initialContractors[0] ? contractorToForm(initialContractors[0]) : emptyForm);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [operatives, setOperatives] = useState<Operative[]>([]);
  const [selectedOperativeId, setSelectedOperativeId] = useState("");
  const [operativeForm, setOperativeForm] = useState<OperativeFormState>(emptyOperativeForm);
  const [operativesLoading, setOperativesLoading] = useState(false);
  const [operativeSaving, setOperativeSaving] = useState(false);
  const [operativeError, setOperativeError] = useState("");
  const [invitations, setInvitations] = useState<InductionInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationSaving, setInvitationSaving] = useState(false);
  const [invitationError, setInvitationError] = useState("");
  const [invitationForm, setInvitationForm] = useState<InvitationFormState>(() => defaultInvitationForm());
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");

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

  useEffect(() => {
    if (!selectedId) {
      setOperatives([]);
      setSelectedOperativeId("");
      setOperativeForm(emptyOperativeForm);
      setInvitations([]);
      setInvitationForm(defaultInvitationForm());
      setCreatedInviteUrl("");
      return;
    }

    let cancelled = false;
    setOperativesLoading(true);
    setOperativeError("");
    fetch(`/api/admin/sites/${site.id}/contractors/${selectedId}/operatives`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load operatives.");
        if (cancelled) return;
        const nextOperatives = (data.operatives ?? []) as Operative[];
        setOperatives(nextOperatives);
        setSelectedOperativeId(nextOperatives[0]?.operativeId ?? "");
        setOperativeForm(nextOperatives[0] ? operativeToForm(nextOperatives[0]) : emptyOperativeForm);
      })
      .catch((caught) => {
        if (!cancelled) setOperativeError(caught instanceof Error ? caught.message : "Unable to load operatives.");
      })
      .finally(() => {
        if (!cancelled) setOperativesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, site.id]);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    setInvitationsLoading(true);
    setInvitationError("");
    fetch(`/api/admin/sites/${site.id}/contractors/${selectedId}/invitations`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load invitations.");
        if (!cancelled) setInvitations(data.invitations ?? []);
      })
      .catch((caught) => {
        if (!cancelled) setInvitationError(caught instanceof Error ? caught.message : "Unable to load invitations.");
      })
      .finally(() => {
        if (!cancelled) setInvitationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, site.id]);

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
    setOperativeError("");
    setInvitationError("");
    setCreatedInviteUrl("");
  }

  function startNewContractor() {
    setSelectedId("");
    setForm(emptyForm);
    setError("");
    setOperativeError("");
    setInvitationError("");
    setInvitations([]);
    setCreatedInviteUrl("");
  }

  function selectOperative(operative: Operative) {
    setSelectedOperativeId(operative.operativeId);
    setOperativeForm(operativeToForm(operative));
    setOperativeError("");
  }

  function startNewOperative() {
    setSelectedOperativeId("");
    setOperativeForm(emptyOperativeForm);
    setOperativeError("");
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

  async function refreshOperatives(contractorId: string, nextSelectedId?: string) {
    const response = await fetch(`/api/admin/sites/${site.id}/contractors/${contractorId}/operatives`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh operatives.");
    const nextOperatives = (data.operatives ?? []) as Operative[];
    setOperatives(nextOperatives);
    if (nextSelectedId) {
      setSelectedOperativeId(nextSelectedId);
      const next = nextOperatives.find((operative) => operative.operativeId === nextSelectedId);
      if (next) setOperativeForm(operativeToForm(next));
    }
  }

  async function refreshInvitations(contractorId: string) {
    const response = await fetch(`/api/admin/sites/${site.id}/contractors/${contractorId}/invitations`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh invitations.");
    setInvitations(data.invitations ?? []);
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContractor) {
      setInvitationError("Select a contractor before creating an invite.");
      return;
    }

    setInvitationSaving(true);
    setInvitationError("");
    setCreatedInviteUrl("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/contractors/${selectedContractor.contractorId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: site.project_id,
          invitedFullName: invitationForm.invitedFullName,
          invitedEmail: invitationForm.invitedEmail,
          invitedPhone: invitationForm.invitedPhone,
          role: invitationForm.role,
          expiresAt: invitationForm.expiresAt ? new Date(`${invitationForm.expiresAt}T23:59:59.000Z`).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create invitation.");
      setCreatedInviteUrl(data.inviteUrl);
      setInvitationForm(defaultInvitationForm());
      await refreshInvitations(selectedContractor.contractorId);
      await refreshContractors(selectedContractor.contractorId);
    } catch (caught) {
      setInvitationError(caught instanceof Error ? caught.message : "Unable to create invitation.");
    } finally {
      setInvitationSaving(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!selectedContractor) return;
    setInvitationError("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/contractors/${selectedContractor.contractorId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, status: "REVOKED" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to revoke invitation.");
      await refreshInvitations(selectedContractor.contractorId);
    } catch (caught) {
      setInvitationError(caught instanceof Error ? caught.message : "Unable to revoke invitation.");
    }
  }

  async function copyInviteUrl() {
    if (!createdInviteUrl) return;
    await navigator.clipboard?.writeText(createdInviteUrl);
  }

  async function saveOperative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContractor) {
      setOperativeError("Select a contractor before adding an operative.");
      return;
    }
    if (!operativeForm.fullName.trim()) {
      setOperativeError("Operative name is required.");
      return;
    }

    setOperativeSaving(true);
    setOperativeError("");
    try {
      const response = await fetch(`/api/admin/sites/${site.id}/contractors/${selectedContractor.contractorId}/operatives`, {
        method: operativeForm.operativeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: site.project_id,
          operativeId: operativeForm.operativeId,
          fullName: operativeForm.fullName,
          role: operativeForm.role,
          siteStatus: operativeForm.siteStatus,
          inductionStatus: operativeForm.inductionStatus,
          email: operativeForm.email,
          phone: operativeForm.phone,
          cscsCardNumber: operativeForm.cscsCardNumber,
          cscsExpiry: operativeForm.cscsExpiry,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save operative.");
      await refreshOperatives(selectedContractor.contractorId, data.operativeId);
      await refreshContractors(selectedContractor.contractorId);
    } catch (caught) {
      setOperativeError(caught instanceof Error ? caught.message : "Unable to save operative.");
    } finally {
      setOperativeSaving(false);
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
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Operatives" value={selectedContractor.operativeCount} />
                <Metric label="Permits" value={selectedContractor.permitCount} />
                <Metric label="RAMS" value={selectedContractor.ramsCount} />
                <Metric label="Inductions" value={selectedContractor.inductionCount} />
              </div>
            </div>
          )}

          <form onSubmit={createInvitation} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Induction Invite</p>
              <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedContractor ? "Create Invite Link" : "Select Contractor"}</h2>
            </div>

            {invitationError && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{invitationError}</p>}

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Operative Name</span>
                <input value={invitationForm.invitedFullName} onChange={(event) => setInvitationForm((current) => ({ ...current, invitedFullName: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Email</span>
                <input value={invitationForm.invitedEmail} type="email" onChange={(event) => setInvitationForm((current) => ({ ...current, invitedEmail: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Phone</span>
                <input value={invitationForm.invitedPhone} onChange={(event) => setInvitationForm((current) => ({ ...current, invitedPhone: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-zinc-700">Role / Trade</span>
                  <input value={invitationForm.role} onChange={(event) => setInvitationForm((current) => ({ ...current, role: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase text-zinc-700">Expires</span>
                  <input value={invitationForm.expiresAt} type="date" onChange={(event) => setInvitationForm((current) => ({ ...current, expiresAt: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
                </label>
              </div>
            </div>

            <button type="submit" disabled={!selectedContractor || invitationSaving} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {invitationSaving ? "Creating..." : "Create Invite"}
            </button>

            {createdInviteUrl && (
              <div className="mt-4 border border-uplands-magenta bg-uplands-paper p-3">
                <p className="text-xs font-bold uppercase text-uplands-magenta">Invite Link Created</p>
                <input value={createdInviteUrl} readOnly className="mt-2 min-h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-uplands-charcoal" />
                <button type="button" onClick={copyInviteUrl} className="mt-2 min-h-10 border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
                  Copy Link
                </button>
              </div>
            )}
          </form>
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
                className={`grid w-full gap-4 p-4 text-left transition md:grid-cols-[1fr_110px_110px_110px_110px] md:items-center ${
                  selectedId === contractor.contractorId ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"
                }`}
              >
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{contractor.name}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[contractor.trade, contractor.primaryContactName, contractor.primaryContactEmail].filter(Boolean).join(" · ") || "No contact details recorded"}</span>
                  <span className="mt-2 inline-flex border border-zinc-300 px-2 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(contractor.siteStatus)}</span>
                </span>
                <span className="text-sm text-uplands-muted">
                  <span className="block text-xs font-bold uppercase">Operatives</span>
                  <span className="font-slab text-2xl text-uplands-charcoal">{contractor.operativeCount}</span>
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

      <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={saveOperative} className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">{operativeForm.operativeId ? "Selected Operative" : "New Operative"}</p>
              <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedContractor ? operativeForm.fullName || "Operative Details" : "Select Contractor"}</h2>
            </div>
            <button type="button" onClick={startNewOperative} disabled={!selectedContractor} className="min-h-10 border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 disabled:opacity-50">
              New
            </button>
          </div>

          {operativeError && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{operativeError}</p>}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-700">Full Name</span>
              <input value={operativeForm.fullName} onChange={(event) => setOperativeForm((current) => ({ ...current, fullName: event.target.value }))} disabled={!selectedContractor} required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-700">Role / Trade</span>
              <input value={operativeForm.role} onChange={(event) => setOperativeForm((current) => ({ ...current, role: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Site Status</span>
                <select value={operativeForm.siteStatus} onChange={(event) => setOperativeForm((current) => ({ ...current, siteStatus: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Induction</span>
                <select value={operativeForm.inductionStatus} onChange={(event) => setOperativeForm((current) => ({ ...current, inductionStatus: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100">
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="INVITED">Invited</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-700">Email</span>
              <input value={operativeForm.email} type="email" onChange={(event) => setOperativeForm((current) => ({ ...current, email: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-700">Phone</span>
              <input value={operativeForm.phone} onChange={(event) => setOperativeForm((current) => ({ ...current, phone: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">CSCS Card</span>
                <input value={operativeForm.cscsCardNumber} onChange={(event) => setOperativeForm((current) => ({ ...current, cscsCardNumber: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">CSCS Expiry</span>
                <input value={operativeForm.cscsExpiry ?? ""} type="date" onChange={(event) => setOperativeForm((current) => ({ ...current, cscsExpiry: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
            </div>
          </div>

          <button type="submit" disabled={!selectedContractor || operativeSaving} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
            {operativeSaving ? "Saving..." : operativeForm.operativeId ? "Save Operative" : "Add Operative"}
          </button>
        </form>

        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Operatives</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{selectedContractor?.name ?? "No Contractor Selected"}</h2>
            </div>
            {operativesLoading && <p className="text-sm font-bold uppercase text-uplands-muted">Loading</p>}
          </div>

          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {operatives.map((operative) => (
              <button
                key={operative.operativeId}
                type="button"
                onClick={() => selectOperative(operative)}
                className={`grid w-full gap-4 p-4 text-left transition md:grid-cols-[1fr_140px_140px_140px] md:items-center ${
                  selectedOperativeId === operative.operativeId ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"
                }`}
              >
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{operative.fullName}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[operative.role, operative.phone, operative.email].filter(Boolean).join(" · ") || "No contact details recorded"}</span>
                  {operative.inductionSubmissionId && (
                    <span className="mt-2 inline-flex text-xs font-bold uppercase text-uplands-magenta">{operative.inductionReference ?? "Induction linked"}</span>
                  )}
                </span>
                <StatusBlock label="Site" value={operative.siteStatus} />
                <StatusBlock label="Induction" value={operative.inductionStatus} />
                <span className="text-sm text-uplands-muted">
                  <span className="block text-xs font-bold uppercase">CSCS</span>
                  <span className="font-din text-base text-uplands-charcoal">{operative.cscsExpiry || operative.cscsCardNumber ? [operative.cscsCardNumber, operative.cscsExpiry].filter(Boolean).join(" · ") : "Not recorded"}</span>
                </span>
              </button>
            ))}
            {selectedContractor && !operativesLoading && operatives.length === 0 && <p className="p-5 text-sm text-uplands-muted">No operatives recorded for this contractor yet.</p>}
            {!selectedContractor && <p className="p-5 text-sm text-uplands-muted">Select a contractor to manage operatives.</p>}
          </div>
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Induction Invitations</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{selectedContractor?.name ?? "No Contractor Selected"}</h2>
          </div>
          {invitationsLoading && <p className="text-sm font-bold uppercase text-uplands-muted">Loading</p>}
        </div>

        <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="grid gap-4 p-4 md:grid-cols-[1fr_130px_150px_120px] md:items-center">
              <span>
                <span className="block font-din text-lg text-uplands-charcoal">{invitation.invitedFullName || "Open invite"}</span>
                <span className="mt-1 block text-sm text-uplands-muted">
                  {[invitation.role, invitation.invitedPhone, invitation.invitedEmail].filter(Boolean).join(" · ") || "No operative details prefilled"}
                </span>
                {invitation.submissionId && <span className="mt-2 inline-flex text-xs font-bold uppercase text-uplands-magenta">Submitted induction linked</span>}
              </span>
              <StatusBlock label="Invite" value={invitation.status} />
              <span className="text-sm text-uplands-muted">
                <span className="block text-xs font-bold uppercase">Expires</span>
                <span className="font-din text-base text-uplands-charcoal">{formatDate(invitation.expiresAt)}</span>
              </span>
              {invitation.status === "INVITED" ? (
                <button type="button" onClick={() => void revokeInvitation(invitation.id)} className="min-h-10 border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
                  Revoke
                </button>
              ) : (
                <span className="text-xs font-bold uppercase text-uplands-muted">{invitation.usedAt ? `Used ${formatDate(invitation.usedAt)}` : formatStatus(invitation.status)}</span>
              )}
            </div>
          ))}
          {selectedContractor && !invitationsLoading && invitations.length === 0 && <p className="p-5 text-sm text-uplands-muted">No induction invitations recorded for this contractor.</p>}
          {!selectedContractor && <p className="p-5 text-sm text-uplands-muted">Select a contractor to manage invitations.</p>}
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

function StatusBlock({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-sm text-uplands-muted">
      <span className="block text-xs font-bold uppercase">{label}</span>
      <span className="mt-1 inline-flex border border-zinc-300 px-2 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(value)}</span>
    </span>
  );
}
