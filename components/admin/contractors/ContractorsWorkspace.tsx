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

type ContractorActivity = {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  title: string;
  detail: string;
  actor: string | null;
  occurredAt: string;
};

type InvitationDeliveryMode = "copy" | "email";

type InvitationFormState = {
  invitedFullName: string;
  invitedEmail: string;
  invitedPhone: string;
  role: string;
  expiresAt: string;
  deliveryMode: InvitationDeliveryMode;
};

type InvitationEmailDelivery = {
  status: "sent" | "missing_recipient" | "not_configured" | "failed";
  message: string;
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

function defaultInvitationForm(deliveryMode: InvitationDeliveryMode = "copy"): InvitationFormState {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return {
    invitedFullName: "",
    invitedEmail: "",
    invitedPhone: "",
    role: "",
    expiresAt: date.toISOString().slice(0, 10),
    deliveryMode,
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function deliveryNotice(result: InvitationEmailDelivery | null | undefined) {
  return result?.message ?? "";
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
  const [contractorActivity, setContractorActivity] = useState<ContractorActivity[]>([]);
  const [contractorActivityLoading, setContractorActivityLoading] = useState(false);
  const [contractorActivityError, setContractorActivityError] = useState("");
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationSaving, setInvitationSaving] = useState(false);
  const [invitationError, setInvitationError] = useState("");
  const [invitationNotice, setInvitationNotice] = useState("");
  const [invitationForm, setInvitationForm] = useState<InvitationFormState>(() => defaultInvitationForm());
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const [createdMailtoHref, setCreatedMailtoHref] = useState("");

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
  const contractorActions = selectedContractor
    ? [
        { title: "Contractor Details", summary: "Update contact, trade and site status.", href: "#contractor-details", metric: selectedContractor.siteStatus },
        { title: "Operatives", summary: "Manage the workforce linked to this contractor.", href: "#operatives", metric: String(selectedContractor.operativeCount) },
        { title: "Induction Invites", summary: "Create secure pre-arrival induction links.", href: "#induction-invite", metric: String(invitations.filter((invite) => invite.status === "INVITED").length) },
        { title: "Permits", summary: "Open permits connected to this site.", href: `/admin/sites/${site.id}/permits`, metric: String(selectedContractor.permitCount) },
        { title: "RAMS", summary: "Open RAMS documents for this site.", href: `/admin/sites/${site.id}/rams`, metric: String(selectedContractor.ramsCount) },
      ]
    : [];

  useEffect(() => {
    if (!selectedId) {
      setOperatives([]);
      setSelectedOperativeId("");
      setOperativeForm(emptyOperativeForm);
      setInvitations([]);
      setContractorActivity([]);
      setInvitationForm(defaultInvitationForm());
      setCreatedInviteUrl("");
      setCreatedMailtoHref("");
      setInvitationNotice("");
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

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    setContractorActivityLoading(true);
    setContractorActivityError("");
    fetch(`/api/admin/sites/${site.id}/contractors/${selectedId}/history`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load contractor history.");
        if (!cancelled) setContractorActivity(data.activity ?? []);
      })
      .catch((caught) => {
        if (!cancelled) setContractorActivityError(caught instanceof Error ? caught.message : "Unable to load contractor history.");
      })
      .finally(() => {
        if (!cancelled) setContractorActivityLoading(false);
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
    setContractorActivityError("");
    setCreatedInviteUrl("");
    setCreatedMailtoHref("");
    setInvitationNotice("");
  }

  function startNewContractor() {
    setSelectedId("");
    setForm(emptyForm);
    setError("");
    setOperativeError("");
    setInvitationError("");
    setInvitations([]);
    setContractorActivity([]);
    setCreatedInviteUrl("");
    setCreatedMailtoHref("");
    setInvitationNotice("");
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
      await refreshContractorActivity(data.contractorId);
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

  async function refreshContractorActivity(contractorId: string) {
    const response = await fetch(`/api/admin/sites/${site.id}/contractors/${contractorId}/history`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh contractor history.");
    setContractorActivity(data.activity ?? []);
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContractor) {
      setInvitationError("Select a contractor before creating an invite.");
      return;
    }

    setInvitationSaving(true);
    setInvitationError("");
    setInvitationNotice("");
    setCreatedInviteUrl("");
    setCreatedMailtoHref("");
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
          deliveryMode: invitationForm.deliveryMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create invitation.");
      setCreatedInviteUrl(data.inviteUrl);
      setCreatedMailtoHref(data.mailtoHref ?? "");
      setInvitationNotice(deliveryNotice(data.emailDelivery));
      setInvitationForm(defaultInvitationForm(invitationForm.deliveryMode));
      await refreshInvitations(selectedContractor.contractorId);
      await refreshContractorActivity(selectedContractor.contractorId);
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
      await refreshContractorActivity(selectedContractor.contractorId);
    } catch (caught) {
      setInvitationError(caught instanceof Error ? caught.message : "Unable to revoke invitation.");
    }
  }

  async function copyInviteUrl() {
    if (!createdInviteUrl) return;
    await navigator.clipboard?.writeText(createdInviteUrl);
    setInvitationNotice("Invite link copied.");
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
      await refreshContractorActivity(selectedContractor.contractorId);
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
          <form id="contractor-details" onSubmit={saveContractor} className="border border-zinc-200 bg-white p-5 shadow-soft">
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

          <form id="induction-invite" onSubmit={createInvitation} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Induction Invite</p>
              <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedContractor ? "Create Invite Link" : "Select Contractor"}</h2>
            </div>

            {invitationError && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{invitationError}</p>}
            {invitationNotice && <p className="mt-4 border-l-4 border-uplands-magenta bg-uplands-paper p-3 text-sm font-bold text-uplands-charcoal">{invitationNotice}</p>}

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Operative Name</span>
                <input value={invitationForm.invitedFullName} onChange={(event) => setInvitationForm((current) => ({ ...current, invitedFullName: event.target.value }))} disabled={!selectedContractor} className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Operative Email</span>
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
              <label className="block">
                <span className="text-xs font-bold uppercase text-zinc-700">Delivery</span>
                <select
                  value={invitationForm.deliveryMode}
                  onChange={(event) => setInvitationForm((current) => ({ ...current, deliveryMode: event.target.value as InvitationDeliveryMode }))}
                  disabled={!selectedContractor}
                  className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm disabled:bg-zinc-100"
                >
                  <option value="copy">Create link only</option>
                  <option value="email">Create and email now</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={!selectedContractor || invitationSaving} className="mt-4 min-h-11 w-full bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {invitationSaving ? "Creating..." : invitationForm.deliveryMode === "email" ? "Create & Email Invite" : "Create Invite"}
            </button>

            {createdInviteUrl && (
              <div className="mt-4 border border-uplands-magenta bg-uplands-paper p-3">
                <p className="text-xs font-bold uppercase text-uplands-magenta">Invite Link Created</p>
                <input value={createdInviteUrl} readOnly className="mt-2 min-h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-uplands-charcoal" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={copyInviteUrl} className="min-h-10 border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
                    Copy Link
                  </button>
                  {createdMailtoHref && (
                    <a href={createdMailtoHref} className="inline-flex min-h-10 items-center border border-zinc-300 px-3 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
                      Open Email
                    </a>
                  )}
                </div>
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

      {selectedContractor && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Selected Contractor</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{selectedContractor.name}</h2>
              <p className="mt-2 text-sm text-uplands-muted">
                {[selectedContractor.trade, selectedContractor.primaryContactName, selectedContractor.primaryContactEmail, selectedContractor.primaryContactPhone].filter(Boolean).join(" · ") ||
                  "No contact details recorded"}
              </p>
            </div>
            <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(selectedContractor.siteStatus)}</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {contractorActions.map((action) => (
              <Link key={action.title} href={action.href} className="flex min-h-40 flex-col justify-between border border-zinc-200 bg-white p-4 transition hover:border-uplands-magenta hover:shadow-soft">
                <span>
                  <span className="block font-slab text-xl leading-tight text-uplands-charcoal">{action.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-uplands-muted">{action.summary}</span>
                </span>
                <span className="mt-4 inline-flex w-fit border border-zinc-300 bg-uplands-paper px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(action.metric)}</span>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">History</p>
                <h3 className="mt-1 font-slab text-2xl text-uplands-charcoal">Recent Contractor Activity</h3>
              </div>
              {contractorActivityLoading && <p className="text-sm font-bold uppercase text-uplands-muted">Loading</p>}
            </div>
            {contractorActivityError && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{contractorActivityError}</p>}
            <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
              {contractorActivity.map((event) => (
                <div key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[120px_1fr_160px] sm:items-start">
                  <span className="text-xs font-bold uppercase text-uplands-muted">{formatDateTime(event.occurredAt)}</span>
                  <span>
                    <span className="block font-din text-base text-uplands-charcoal">{event.title}</span>
                    <span className="mt-1 block text-sm text-uplands-muted">{event.detail}</span>
                  </span>
                  <span className="text-xs font-bold uppercase text-uplands-muted">{event.actor || formatStatus(event.eventType)}</span>
                </div>
              ))}
              {!contractorActivityLoading && contractorActivity.length === 0 && <p className="p-4 text-sm text-uplands-muted">No contractor history recorded yet.</p>}
            </div>
          </div>
        </section>
      )}

      <section id="operatives" className="grid gap-5 lg:grid-cols-[380px_1fr]">
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
