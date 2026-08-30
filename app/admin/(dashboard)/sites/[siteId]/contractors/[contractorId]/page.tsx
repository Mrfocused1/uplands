import Link from "next/link";
import { notFound } from "next/navigation";

import { listContractorActivityEvents } from "@/lib/db/activity";
import { isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";
import { listInductionInvitations } from "@/lib/db/inductionInvitations";
import { listSiteOperatives } from "@/lib/db/operatives";
import { listPermitsBySite } from "@/lib/db/permits";
import { listRamsDocuments } from "@/lib/db/rams";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Contractor Workspace | Uplands Admin",
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function metricHref(siteId: string, contractorId: string, target: string) {
  return `/admin/sites/${siteId}/contractors?contractorId=${encodeURIComponent(contractorId)}${target}`;
}

export default async function ContractorWorkspacePage({ params }: { params: Promise<{ siteId: string; contractorId: string }> }) {
  const { siteId, contractorId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();

  let contractors;
  try {
    contractors = await listSiteContractors(site.id);
  } catch (error) {
    if (!isContractorDatabaseSetupError(error)) throw error;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Contractor Setup Required</p>
        <h1 className="mt-3 font-slab text-4xl text-uplands-charcoal">Contractors Need The Supabase Migration</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Apply the latest Supabase migrations to enable the site contractor workspace.</p>
      </section>
    );
  }

  const contractor = contractors.find((row) => row.contractor_id === contractorId);
  if (!contractor) notFound();

  const [operatives, invitations, activity, sitePermits, siteRams] = await Promise.all([
    listSiteOperatives(site.id, contractor.contractor_id),
    listInductionInvitations(site.id, contractor.contractor_id),
    listContractorActivityEvents(site.id, contractor.contractor_id),
    listPermitsBySite(site.id),
    listRamsDocuments({ siteId: site.id }),
  ]);
  const permits = sitePermits.filter((permit) => permit.contractor_id === contractor.contractor_id || permit.contractor === contractor.name);
  const rams = siteRams.filter((document) => document.contractor_id === contractor.contractor_id || document.contractor === contractor.name);
  const activeInvites = invitations.filter((invite) => invite.status === "INVITED").length;
  const activePermits = permits.filter((permit) => permit.status === "ACTIVE" || permit.status === "AUTHORISED").length;
  const openPermitStatuses = new Set(["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED"]);
  const permitsMissingRams = permits.filter((permit) => openPermitStatuses.has(permit.status) && !permit.rams_document_id).length;
  const permitsWithRams = permits.filter((permit) => permit.rams_document_id).length;

  const cards = [
    { title: "Profile", value: formatStatus(contractor.site_status), href: metricHref(site.id, contractor.contractor_id, "#contractor-details") },
    { title: "Operatives", value: String(operatives.length), href: metricHref(site.id, contractor.contractor_id, "#operatives") },
    { title: "Induction Invites", value: String(activeInvites), href: metricHref(site.id, contractor.contractor_id, "#induction-invite") },
    { title: "RAMS", value: String(rams.length), href: `/admin/sites/${site.id}/rams?contractorId=${encodeURIComponent(contractor.contractor_id)}` },
    { title: "Permits", value: String(permits.length), href: `/admin/sites/${site.id}/permits?contractorId=${encodeURIComponent(contractor.contractor_id)}` },
    { title: "Linked RAMS", value: String(permitsWithRams), href: `/admin/sites/${site.id}/permits?contractorId=${encodeURIComponent(contractor.contractor_id)}` },
    { title: "Missing RAMS", value: String(permitsMissingRams), href: `/admin/sites/${site.id}/permits?contractorId=${encodeURIComponent(contractor.contractor_id)}` },
    { title: "History", value: String(activity.length), href: "#history" },
  ];

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Contractor Workspace</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{contractor.name}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
              {site.location}
              {contractor.trade ? ` · ${contractor.trade}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/sites/${site.id}`} className="inline-flex min-h-11 items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
              Back to admin
            </Link>
            <a
              href={`/admin/sites/${site.id}/contractors?contractorId=${encodeURIComponent(contractor.contractor_id)}`}
              className="inline-flex min-h-11 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta hover:bg-uplands-paper"
            >
              Manage contractor
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            className={`flex min-h-40 flex-col justify-between border p-4 shadow-soft transition hover:border-uplands-magenta ${
              card.title === "Missing RAMS" && permitsMissingRams > 0 ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-uplands-muted">{card.title}</span>
            <span className={`font-slab text-4xl ${card.title === "Missing RAMS" && permitsMissingRams > 0 ? "text-amber-900" : "text-uplands-charcoal"}`}>{card.value}</span>
          </a>
        ))}
      </section>

      <section id="profile" className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Profile</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Trade / Work Package" value={contractor.trade} />
            <Field label="Site Status" value={formatStatus(contractor.site_status)} />
            <Field label="Primary Contact" value={contractor.primary_contact_name} />
            <Field label="Email" value={contractor.primary_contact_email} />
            <Field label="Phone" value={contractor.primary_contact_phone} />
          </dl>
        </div>

        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Permit Watch</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{activePermits} Active / Authorised</h2>
            </div>
            <Link href={`/admin/sites/${site.id}/permits?contractorId=${encodeURIComponent(contractor.contractor_id)}`} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
              Open permits
            </Link>
          </div>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {permits.slice(0, 6).map((permit) => (
              <Link key={permit.id} href={`/admin/sites/${site.id}/permits?contractorId=${encodeURIComponent(contractor.contractor_id)}&permitId=${encodeURIComponent(permit.id)}`} className="grid gap-2 p-4 hover:bg-uplands-paper md:grid-cols-[1fr_150px_120px] md:items-center">
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{permit.template_title ?? permit.template_id}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{permit.permit_number} · {permit.location_of_work}</span>
                  <span className={`mt-2 inline-flex border px-2 py-1 text-[11px] font-bold uppercase ${permit.rams_document_id ? "border-zinc-300 text-zinc-700" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                    {permit.rams_document_id
                      ? [permit.rams_document_title, permit.rams_document_reference, permit.rams_document_revision ? `Rev ${permit.rams_document_revision}` : ""].filter(Boolean).join(" - ") || "RAMS linked"
                      : "Missing linked RAMS"}
                  </span>
                </span>
                <span className="text-xs font-bold uppercase text-zinc-700">{formatStatus(permit.status)}</span>
                <span className="text-sm text-uplands-muted">{permit.valid_to_time}</span>
              </Link>
            ))}
            {permits.length === 0 && <p className="p-4 text-sm text-uplands-muted">No permits recorded for this contractor.</p>}
          </div>
        </div>
      </section>

      <section id="operatives" className="grid gap-5 lg:grid-cols-2">
        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Operatives</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Current Workforce</h2>
            </div>
            <a href={metricHref(site.id, contractor.contractor_id, "#operatives")} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
              Manage operatives
            </a>
          </div>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {operatives.map((operative) => (
              <div key={operative.site_operative_id} className="grid gap-3 p-4 md:grid-cols-[1fr_140px] md:items-center">
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{operative.full_name}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[operative.role, operative.phone, operative.email].filter(Boolean).join(" · ") || "No contact details recorded"}</span>
                </span>
                <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(operative.induction_status)}</span>
              </div>
            ))}
            {operatives.length === 0 && <p className="p-4 text-sm text-uplands-muted">No operatives recorded for this contractor.</p>}
          </div>
        </div>

        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Induction Invites</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{activeInvites} Active Links</h2>
            </div>
            <a href={metricHref(site.id, contractor.contractor_id, "#induction-invite")} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
              Create invite
            </a>
          </div>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {invitations.slice(0, 8).map((invite) => (
              <div key={invite.id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px_120px] md:items-center">
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{invite.invited_full_name || "Open invite"}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[invite.role, invite.invited_email, invite.invited_phone].filter(Boolean).join(" · ") || "No details prefilled"}</span>
                </span>
                <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(invite.status)}</span>
                <span className="text-sm text-uplands-muted">{formatDate(invite.expires_at)}</span>
              </div>
            ))}
            {invitations.length === 0 && <p className="p-4 text-sm text-uplands-muted">No induction invites recorded for this contractor.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">RAMS</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Documents</h2>
            </div>
            <Link href={`/admin/sites/${site.id}/rams?contractorId=${encodeURIComponent(contractor.contractor_id)}`} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
              Open RAMS
            </Link>
          </div>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {rams.slice(0, 6).map((document) => (
              <Link key={document.id} href={`/admin/sites/${site.id}/rams?contractorId=${encodeURIComponent(contractor.contractor_id)}&documentId=${encodeURIComponent(document.id)}`} className="grid gap-3 p-4 hover:bg-uplands-paper md:grid-cols-[1fr_140px] md:items-center">
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{document.title}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{[document.document_reference, document.revision].filter(Boolean).join(" · ") || document.file_name}</span>
                </span>
                <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{formatStatus(document.processing_status)}</span>
              </Link>
            ))}
            {rams.length === 0 && <p className="p-4 text-sm text-uplands-muted">No RAMS documents recorded for this contractor.</p>}
          </div>
        </div>

        <div id="history" className="border border-zinc-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">History</p>
          <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Recent Activity</h2>
          <div className="mt-5 divide-y divide-zinc-200 border border-zinc-200">
            {activity.map((event) => (
              <div key={event.id} className="grid gap-2 p-4 md:grid-cols-[120px_1fr] md:items-start">
                <span className="text-xs font-bold uppercase text-uplands-muted">{formatDateTime(event.occurred_at)}</span>
                <span>
                  <span className="block font-din text-base text-uplands-charcoal">{event.title}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{event.detail}</span>
                </span>
              </div>
            ))}
            {activity.length === 0 && <p className="p-4 text-sm text-uplands-muted">No contractor activity recorded yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-uplands-muted">{label}</dt>
      <dd className="mt-1 font-din text-base text-uplands-charcoal">{value || "Not recorded"}</dd>
    </div>
  );
}
