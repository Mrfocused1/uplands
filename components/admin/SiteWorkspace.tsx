import Link from "next/link";

import { portalActionsForSite, portalSiteFromRow } from "@/lib/admin/sitePortal";
import type { SiteRow, SiteWorkspaceSummary } from "@/lib/db/sites";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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

      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Today</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Site Snapshot</h2>
          </div>
          <span className="w-fit border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{portalSite.status}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </article>
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
            <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[90px_1fr] sm:items-start">
              <span className="text-xs font-bold uppercase text-uplands-muted">{formatTime(item.occurredAt)}</span>
              <span>
                <span className="block font-din text-base text-uplands-charcoal">{item.title}</span>
                <span className="mt-1 block text-sm text-uplands-muted">{item.detail}</span>
              </span>
            </div>
          ))}
          {summary.recentActivity.length === 0 && <p className="p-4 text-sm text-uplands-muted">No linked site activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
