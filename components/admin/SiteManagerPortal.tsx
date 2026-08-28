"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Site = {
  id: string;
  name: string;
  location: string;
  summary: string;
  status: string;
};

const sites: Site[] = [
  {
    id: "newport",
    name: "Newport",
    location: "Waitrose Newport",
    summary: "Current RAMS reviews, site inductions, forms and document tools for the Newport works.",
    status: "Active",
  },
  {
    id: "balham",
    name: "Balham",
    location: "Waitrose Balham",
    summary: "Editable daily report documents and site document preparation for Balham.",
    status: "Testing",
  },
  {
    id: "plymouth",
    name: "Plymouth",
    location: "Plymouth Depot",
    summary: "Prepared for future Uplands site-management records.",
    status: "Planned",
  },
  {
    id: "bristol",
    name: "Bristol",
    location: "Bristol Retail Works",
    summary: "Prepared for future Uplands site-management records.",
    status: "Planned",
  },
  {
    id: "london",
    name: "London Central",
    location: "Central London Sites",
    summary: "Prepared for future Uplands site-management records.",
    status: "Planned",
  },
];

const portalActions = [
  {
    title: "Inductions",
    summary: "Review submitted UHSF16.01 inductions, evidence uploads, signatures, generated PDFs and admin record details.",
    href: "/admin/submissions",
    label: "Open inductions",
  },
  {
    title: "RAMS",
    summary: "Open contractor RAMS, review completed UHSF16.01 forms, search document intelligence and use the RAMS copilot.",
    href: "/admin/rams",
    label: "Open RAMS",
  },
  {
    title: "Forms",
    summary: "Start or test the public site induction form flow as an operative would complete it on site.",
    href: "/form",
    label: "Open form",
  },
  {
    title: "Edit Images",
    summary: "Edit prepared PDF image pages, print selected pages and download a finished PDF copy.",
    href: "/edit-images",
    label: "Open editor",
  },
];

function siteMatches(site: Site, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [site.name, site.location, site.summary, site.status].some((field) => field.toLowerCase().includes(value));
}

export function SiteManagerPortal() {
  const [query, setQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const filteredSites = useMemo(() => sites.filter((site) => siteMatches(site, query)), [query]);
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;

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
          {filteredSites.map((site) => {
            const selected = selectedSiteId === site.id;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => setSelectedSiteId(site.id)}
                className={`grid w-full gap-4 px-4 py-4 text-left transition sm:grid-cols-[1fr_auto] sm:items-center ${
                  selected ? "bg-uplands-paper" : "bg-white hover:bg-uplands-paper"
                }`}
              >
                <span>
                  <span className="block font-din text-xl text-uplands-charcoal">{site.name}</span>
                  <span className="mt-1 block text-sm font-bold text-zinc-700">{site.location}</span>
                  <span className="mt-1 block text-sm leading-6 text-uplands-muted">{site.summary}</span>
                </span>
                <span className="flex items-center gap-3 sm:justify-end">
                  <span className="border border-zinc-300 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">{site.status}</span>
                  <span className="border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta">
                    {selected ? "Selected" : "Select"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {filteredSites.length === 0 && <p className="mt-4 border border-zinc-200 bg-uplands-paper p-4 text-sm text-uplands-muted">No sites match that search.</p>}
      </section>

      {selectedSite && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Selected Site</p>
            <h2 className="mt-1 font-slab text-3xl text-uplands-charcoal">{selectedSite.location}</h2>
            <p className="mt-2 text-sm leading-6 text-uplands-muted">Open a management area for {selectedSite.name}.</p>
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
      )}
    </div>
  );
}
