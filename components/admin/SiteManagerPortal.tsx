"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { portalSites, type PortalSite } from "@/lib/admin/sitePortal";

function siteMatches(site: PortalSite, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [site.name, site.location, site.summary, site.status].some((field) => field.toLowerCase().includes(value));
}

export function SiteManagerPortal() {
  const [query, setQuery] = useState("");

  const filteredSites = useMemo(() => portalSites.filter((site) => siteMatches(site, query)), [query]);

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Site Manager Portal</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <h1 className="font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">Select Your Site</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
              Choose a site to open the relevant Uplands management tools for inductions, RAMS, forms and document editing.
            </p>
          </div>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Search Sites</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by site, location or status..."
              className="mt-2 min-h-12 w-full border border-zinc-300 bg-white px-4 text-base outline-none focus:border-uplands-magenta"
            />
          </label>
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-slab text-2xl text-uplands-charcoal">Sites</h2>
            <p className="mt-1 text-sm text-uplands-muted">Newport is listed first because it is the current active site.</p>
          </div>
          <span className="text-xs font-bold uppercase text-uplands-muted">{filteredSites.length} shown</span>
        </div>

        <div className="divide-y divide-zinc-200 border border-zinc-200">
          {filteredSites.map((site) => (
            <Link
              key={site.id}
              href={`/admin/sites/${site.id}`}
              className="grid w-full gap-4 bg-white px-4 py-4 text-left transition hover:bg-uplands-paper sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <span>
                <span className="block font-din text-xl text-uplands-charcoal">{site.name}</span>
                <span className="mt-1 block text-sm font-bold text-zinc-700">{site.location}</span>
                <span className="mt-1 block text-sm leading-6 text-uplands-muted">{site.summary}</span>
              </span>
              <span className="flex items-center gap-3 sm:justify-end">
                <span className="border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{site.status}</span>
                <span className="border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">Select</span>
              </span>
            </Link>
          ))}
        </div>

        {filteredSites.length === 0 && <p className="mt-4 border border-zinc-200 bg-uplands-paper p-4 text-sm text-uplands-muted">No sites match that search.</p>}
      </section>
    </div>
  );
}
