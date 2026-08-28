import Link from "next/link";

import { portalActions, type PortalSite } from "@/lib/admin/sitePortal";

export function SiteWorkspace({ site }: { site: PortalSite }) {
  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Selected Site</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">{site.location}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
              Open a management area for {site.name}. You can also move directly between areas from the admin menu.
            </p>
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
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Site Tools</p>
          <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">Choose A Workflow</h2>
          <p className="mt-2 text-sm leading-6 text-uplands-muted">
            These areas cover the current Uplands admin workflows for site records, RAMS, forms and document editing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {portalActions.map((action) => (
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
    </div>
  );
}
