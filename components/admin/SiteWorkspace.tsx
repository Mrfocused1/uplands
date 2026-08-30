import Link from "next/link";

import { portalActionsForSite, portalSiteFromRow } from "@/lib/admin/sitePortal";
import type { SiteRow, SiteWorkspaceSummary } from "@/lib/db/sites";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatPermitExpiry(date: string, time: string) {
  const expiry = new Date(`${date}T${time || "00:00"}:00`);
  const diff = expiry.getTime() - Date.now();
  if (Number.isNaN(expiry.getTime())) return `Expires ${time}`;
  if (diff <= 0) return "Expired";

  const totalMinutes = Math.round(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${minutes}m remaining`;
  return `Expires ${expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })} ${time}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function SiteWorkspace({ site, summary }: { site: SiteRow; summary: SiteWorkspaceSummary }) {
  const portalSite = portalSiteFromRow(site);
  const actions = portalActionsForSite(site.id);

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Selected Site</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{portalSite.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
              Open a management area for {portalSite.name}. Everything here is scoped to this site workspace.
            </p>
            {portalSite.projectName && <p className="mt-2 text-sm font-bold text-zinc-700">Project: {portalSite.projectName}</p>}
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-12 w-fit items-center border border-zinc-300 px-5 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
          >
            Change site
          </Link>
        </div>
      </section>

      {summary.activePermits.length > 0 && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Active Permits</p>
              <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Permit Watch</h2>
            </div>
            <Link href={`/admin/sites/${site.id}/permits`} className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
              Open permits
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summary.activePermits.map((permit) => (
              <Link key={permit.id} href={permit.href} className={`border p-4 transition hover:border-uplands-magenta hover:shadow-soft ${permit.missingLinkedRams ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-uplands-paper"}`}>
                <span className="block text-xs font-bold uppercase text-uplands-muted">{permit.permitNumber}</span>
                <span className="mt-2 block font-slab text-2xl text-uplands-charcoal">{permit.title}</span>
                <span className="mt-2 block text-sm text-zinc-700">{permit.contractor}</span>
                <span className="mt-3 inline-flex border border-zinc-300 bg-white px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{permit.status.replaceAll("_", " ")}</span>
                <span className={`mt-2 block text-xs font-bold uppercase ${permit.missingLinkedRams ? "text-amber-800" : "text-uplands-muted"}`}>
                  {permit.linkedRams ?? "Missing linked RAMS"}
                </span>
                <span className="mt-2 block text-sm font-bold text-uplands-magenta">{formatPermitExpiry(permit.validToDate, permit.validToTime)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Today</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Site Snapshot</h2>
          </div>
          <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{portalSite.status}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="border border-zinc-200 bg-uplands-paper p-4">
            <p className="text-xs font-bold uppercase text-uplands-muted">Attendance</p>
            <p className="mt-2 font-slab text-4xl text-uplands-charcoal">{summary.peopleOnSite}</p>
            <p className="mt-1 text-sm text-uplands-muted">people currently on site</p>
          </article>
          <article className="border border-zinc-200 bg-uplands-paper p-4">
            <p className="text-xs font-bold uppercase text-uplands-muted">Inductions</p>
            <p className="mt-2 font-slab text-4xl text-uplands-charcoal">{summary.inductions.awaitingReview}</p>
            <p className="mt-1 text-sm text-uplands-muted">{summary.inductions.ready} ready, {summary.inductions.total} total</p>
          </article>
          <article className="border border-zinc-200 bg-uplands-paper p-4">
            <p className="text-xs font-bold uppercase text-uplands-muted">RAMS</p>
            <p className="mt-2 font-slab text-4xl text-uplands-charcoal">{summary.rams.processing}</p>
            <p className="mt-1 text-sm text-uplands-muted">{summary.rams.ready} ready, {summary.rams.total} uploaded</p>
          </article>
          <article className="border border-zinc-200 bg-uplands-paper p-4">
            <p className="text-xs font-bold uppercase text-uplands-muted">Permits</p>
            <p className="mt-2 font-slab text-4xl text-uplands-charcoal">{summary.permits.active}</p>
            <p className="mt-1 text-sm text-uplands-muted">{summary.permits.expiringSoon} expiring soon, {summary.permits.awaitingClosure} awaiting closure</p>
            {summary.permits.missingLinkedRams > 0 && <p className="mt-2 text-xs font-bold uppercase text-amber-800">{summary.permits.missingLinkedRams} missing linked RAMS</p>}
          </article>
          <Link href={`/admin/sites/${site.id}/handover`} className="border border-zinc-200 bg-uplands-paper p-4 transition hover:border-uplands-magenta hover:shadow-soft">
            <p className="text-xs font-bold uppercase text-uplands-muted">Handover</p>
            <p className="mt-2 font-slab text-4xl text-uplands-charcoal">{summary.handover.unacknowledged}</p>
            <p className="mt-1 text-sm text-uplands-muted">
              {summary.handover.latest
                ? `${summary.handover.latest.shift.toLowerCase()} ${summary.handover.latest.status.toLowerCase()} · ${formatShortDate(summary.handover.latest.handoverDate)}`
                : "no handover yet"}
            </p>
            {summary.handover.outstandingActions > 0 && <p className="mt-2 text-xs font-bold uppercase text-amber-800">{summary.handover.outstandingActions} with actions</p>}
          </Link>
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Site Tools</p>
          <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Choose A Workflow</h2>
          <p className="mt-2 text-sm leading-6 text-uplands-muted">
            These areas cover the current Uplands admin workflows for site records, RAMS, forms and document editing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex min-h-48 flex-col justify-between border border-zinc-200 bg-white p-5 transition hover:border-uplands-magenta hover:shadow-soft"
            >
              <span>
                <span className="block font-slab text-2xl text-uplands-charcoal">{action.title}</span>
                <span className="mt-3 block text-sm leading-6 text-uplands-muted">{action.summary}</span>
              </span>
              <span className="mt-6 inline-flex w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Timeline</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Recent Activity</h2>
          </div>
        </div>
        <div className="divide-y divide-zinc-200 border border-zinc-200">
          {summary.recentActivity.map((item) => (
            item.href ? (
              <Link key={item.id} href={item.href} className="grid gap-2 px-4 py-3 hover:bg-uplands-paper sm:grid-cols-[90px_1fr] sm:items-start">
                <span className="text-xs font-bold uppercase text-uplands-muted">{formatTime(item.occurredAt)}</span>
                <span>
                  <span className="block font-din text-base text-uplands-charcoal">{item.title}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{item.detail}</span>
                </span>
              </Link>
            ) : (
              <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[90px_1fr] sm:items-start">
                <span className="text-xs font-bold uppercase text-uplands-muted">{formatTime(item.occurredAt)}</span>
                <span>
                  <span className="block font-din text-base text-uplands-charcoal">{item.title}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{item.detail}</span>
                </span>
              </div>
            )
          ))}
          {summary.recentActivity.length === 0 && <p className="p-4 text-sm text-uplands-muted">No linked site activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
