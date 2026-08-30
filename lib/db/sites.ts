import { DEFAULT_SITE_SEEDS } from "@/config/siteSeeds";
import { listSiteActivityEvents, type SiteActivityEventRow } from "@/lib/db/activity";
import { getDb } from "@/lib/db";
import { countPermitsBySite, listPriorityPermitsBySite, type PermitRow } from "@/lib/db/permits";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SiteStatus = "ACTIVE" | "TESTING" | "PLANNED" | "ARCHIVED";

export type SiteRow = {
  id: string;
  name: string;
  location: string;
  summary: string;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  project_name: string | null;
  project_reference: string | null;
};

export type SiteActivityItem = {
  id: string;
  type: "induction_submitted" | "rams_uploaded" | string;
  title: string;
  detail: string;
  occurredAt: string;
  href?: string;
};

export type SitePermitSummaryItem = {
  id: string;
  permitNumber: string;
  title: string;
  contractor: string;
  status: string;
  validToDate: string;
  validToTime: string;
  href: string;
};

export type SiteWorkspaceSummary = {
  peopleOnSite: number;
  inductions: {
    total: number;
    awaitingReview: number;
    ready: number;
  };
  rams: {
    total: number;
    ready: number;
    processing: number;
  };
  permits: {
    active: number;
    expiringSoon: number;
    awaitingClosure: number;
  };
  activePermits: SitePermitSummaryItem[];
  recentActivity: SiteActivityItem[];
};

function shouldUseSupabaseSitesDb() {
  const provider = env("SITES_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("SITES_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function shouldUseSupabaseModuleDb(providerKey: "SUBMISSIONS_DATABASE_PROVIDER" | "RAMS_DATABASE_PROVIDER") {
  const provider = env(providerKey, env("UPLANDS_DATABASE_PROVIDER", "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error(`${providerKey} is set to supabase, but Supabase admin environment variables are missing.`);
  }
  return provider === "supabase";
}

function assertNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function isMissingSiteIdError(error: { message: string } | null) {
  if (!error) return false;
  return /site_id|Could not find .*site_id/i.test(error.message);
}

function siteOrderExpression() {
  return "CASE s.status WHEN 'ACTIVE' THEN 0 WHEN 'TESTING' THEN 1 WHEN 'PLANNED' THEN 2 ELSE 3 END";
}

function siteNameMatchesSite(site: SiteRow, siteName: string | null) {
  const value = siteName?.trim().toLowerCase();
  if (!value) return false;

  const candidates = [site.id, site.name, site.location, site.project_name].filter((item): item is string => Boolean(item)).map((item) => item.toLowerCase());
  return candidates.some((candidate) => value === candidate || value.includes(candidate) || candidate.includes(value));
}

function mapSeedFallback(): SiteRow[] {
  const now = new Date().toISOString();
  return DEFAULT_SITE_SEEDS.map((site) => ({
    id: site.id,
    name: site.name,
    location: site.location,
    summary: site.summary,
    status: site.status,
    created_at: now,
    updated_at: now,
    project_id: site.project.id,
    project_name: site.project.name,
    project_reference: site.project.reference,
  }));
}

export async function listSites(): Promise<SiteRow[]> {
  if (shouldUseSupabaseSitesDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("sites_with_primary_project").select("*");
    assertNoError(error, "Unable to list sites");
    return (data ?? []) as SiteRow[];
  }

  return getDb()
    .prepare(
      `SELECT s.id, s.name, s.location, s.summary, s.status, s.created_at, s.updated_at,
              p.id AS project_id, p.name AS project_name, p.reference AS project_reference
       FROM sites s
       LEFT JOIN projects p ON p.site_id = s.id AND p.status = 'ACTIVE'
       ORDER BY ${siteOrderExpression()}, s.name ASC`,
    )
    .all() as SiteRow[];
}

export async function getSite(siteId: string): Promise<SiteRow | null> {
  if (shouldUseSupabaseSitesDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("sites_with_primary_project").select("*").eq("id", siteId).maybeSingle();
    assertNoError(error, "Unable to get site");
    return (data as SiteRow | null) ?? null;
  }

  const row = getDb()
    .prepare(
      `SELECT s.id, s.name, s.location, s.summary, s.status, s.created_at, s.updated_at,
              p.id AS project_id, p.name AS project_name, p.reference AS project_reference
       FROM sites s
       LEFT JOIN projects p ON p.site_id = s.id AND p.status = 'ACTIVE'
       WHERE s.id = ?`,
    )
    .get(siteId) as SiteRow | undefined;

  if (row) return row;
  return mapSeedFallback().find((site) => site.id === siteId) ?? null;
}

export async function resolveSiteIdFromName(siteName: string | null | undefined): Promise<string | null> {
  const value = siteName?.trim().toLowerCase();
  if (!value) return null;

  const sites = await listSites();
  return (
    sites.find((site) => {
      return siteNameMatchesSite(site, value);
    })?.id ?? null
  );
}

export async function getSiteWorkspaceSummary(siteId: string): Promise<SiteWorkspaceSummary> {
  const site = await getSite(siteId);
  if (!site) return buildSummary([], []);

  const [inductionRows, ramsRows, permits, priorityPermits, activityRows] = await Promise.all([
    listSiteSummaryInductions(site),
    listSiteSummaryRams(site),
    countPermitsBySite(site.id),
    listPriorityPermitsBySite(site.id),
    listSiteActivityEvents(site.id, 20),
  ]);
  return buildSummary(inductionRows, ramsRows, permits, priorityPermits, activityRows);
}

async function listSiteSummaryInductions(site: SiteRow) {
  if (shouldUseSupabaseModuleDb("SUBMISSIONS_DATABASE_PROVIDER")) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("id, reference, full_name, company_name, site_name, print_review_status, created_at")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (isMissingSiteIdError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("submissions")
        .select("id, reference, full_name, company_name, site_name, print_review_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      assertNoError(legacyError, "Unable to summarise site inductions");
      return ((legacyData ?? []) as SummaryInductionRow[]).filter((row) => siteNameMatchesSite(site, row.site_name)).slice(0, 20);
    }

    assertNoError(error, "Unable to summarise site inductions");
    return (data ?? []) as SummaryInductionRow[];
  }

  return getDb()
    .prepare(
      `SELECT id, reference, full_name, company_name, site_name, print_review_status, created_at
       FROM submissions
       WHERE site_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all(site.id) as SummaryInductionRow[];
}

async function listSiteSummaryRams(site: SiteRow) {
  if (shouldUseSupabaseModuleDb("RAMS_DATABASE_PROVIDER")) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("rams_documents")
      .select("id, title, contractor, site_name, processing_status, created_at")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (isMissingSiteIdError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("rams_documents")
        .select("id, title, contractor, site_name, processing_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      assertNoError(legacyError, "Unable to summarise site RAMS");
      return ((legacyData ?? []) as SummaryRamsRow[]).filter((row) => siteNameMatchesSite(site, row.site_name)).slice(0, 20);
    }

    assertNoError(error, "Unable to summarise site RAMS");
    return (data ?? []) as SummaryRamsRow[];
  }

  return getDb()
    .prepare(
      `SELECT id, title, contractor, site_name, processing_status, created_at
       FROM rams_documents
       WHERE site_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all(site.id) as SummaryRamsRow[];
}

type SummaryInductionRow = { id: string; reference: string | null; full_name: string | null; company_name: string | null; site_name: string | null; print_review_status: string; created_at: string };
type SummaryRamsRow = { id: string; title: string; contractor: string; site_name: string | null; processing_status: string; created_at: string };

function buildSummary(
  inductionRows: SummaryInductionRow[],
  ramsRows: SummaryRamsRow[],
  permits = { active: 0, expiringSoon: 0, awaitingClosure: 0 },
  priorityPermits: PermitRow[] = [],
  activityRows: SiteActivityEventRow[] = [],
): SiteWorkspaceSummary {
  const recentActivity: SiteActivityItem[] = [
    ...activityRows.map((row) => ({
      id: `activity-${row.id}`,
      type: row.event_type,
      title: row.title,
      detail: row.detail,
      occurredAt: row.occurred_at,
      href: row.entity_type === "permit" ? `/admin/sites/${row.site_id}/permits` : undefined,
    })),
    ...inductionRows.map((row) => ({
      id: `induction-${row.id}`,
      type: "induction_submitted" as const,
      title: "Induction submitted",
      detail: [row.full_name, row.company_name, row.reference].filter(Boolean).join(" · ") || "Induction record",
      occurredAt: row.created_at,
    })),
    ...ramsRows.map((row) => ({
      id: `rams-${row.id}`,
      type: "rams_uploaded" as const,
      title: "RAMS uploaded",
      detail: [row.contractor, row.title].filter(Boolean).join(" · "),
      occurredAt: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 6);

  return {
    peopleOnSite: 0,
    inductions: {
      total: inductionRows.length,
      awaitingReview: inductionRows.filter((row) => row.print_review_status !== "ready").length,
      ready: inductionRows.filter((row) => row.print_review_status === "ready").length,
    },
    rams: {
      total: ramsRows.length,
      ready: ramsRows.filter((row) => row.processing_status === "READY").length,
      processing: ramsRows.filter((row) => row.processing_status === "PROCESSING" || row.processing_status === "UPLOADED").length,
    },
    permits: {
      active: permits.active,
      expiringSoon: permits.expiringSoon,
      awaitingClosure: permits.awaitingClosure,
    },
    activePermits: priorityPermits.map((permit) => ({
      id: permit.id,
      permitNumber: permit.permit_number,
      title: permit.template_title ?? permit.template_code ?? "Permit",
      contractor: permit.contractor,
      status: permit.status,
      validToDate: permit.valid_to_date,
      validToTime: permit.valid_to_time,
      href: `/admin/sites/${permit.site_id}/permits`,
    })),
    recentActivity,
  };
}
