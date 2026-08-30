import { DEFAULT_SITE_SEEDS } from "@/config/siteSeeds";
import type { SiteRow } from "@/lib/db/sites";

export type PortalSite = {
  id: string;
  name: string;
  location: string;
  summary: string;
  status: string;
  projectId?: string | null;
  projectName?: string | null;
  projectReference?: string | null;
};

export type PortalAction = {
  title: string;
  summary: string;
  href: string;
  label: string;
};

export const portalSites: PortalSite[] = DEFAULT_SITE_SEEDS.map((site) => ({
  id: site.id,
  name: site.name,
  location: site.location,
  summary: site.summary,
  status: titleCaseStatus(site.status),
  projectId: site.project.id,
  projectName: site.project.name,
  projectReference: site.project.reference,
}));

export function portalSiteFromRow(site: SiteRow): PortalSite {
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    summary: site.summary,
    status: titleCaseStatus(site.status),
    projectId: site.project_id,
    projectName: site.project_name,
    projectReference: site.project_reference,
  };
}

export function portalActionsForSite(siteId?: string): PortalAction[] {
  const formsHref = siteId ? `/admin/sites/${siteId}/forms` : "/admin/forms";
  const ramsHref = siteId ? `/admin/sites/${siteId}/rams` : "/admin/rams";
  const permitsHref = siteId ? `/admin/sites/${siteId}/permits` : "/admin";
  const contractorsHref = siteId ? `/admin/sites/${siteId}/contractors` : "/admin";
  const attendanceHref = siteId ? `/admin/sites/${siteId}/attendance` : "/admin";
  const editImagesHref = siteId ? `/admin/sites/${siteId}/edit-images` : "/edit-images";
  const formReturn = siteId ? encodeURIComponent(formsHref) : formsHref;

  return [
    {
      title: "Inductions",
      summary: "Choose the inductee or inductor workflow, start new records, review submitted inductions and download completed PDFs.",
      href: formsHref,
      label: "Open inductions",
    },
    {
      title: "RAMS",
      summary: "Open contractor RAMS, review completed UHSF16.01 forms, search document intelligence and use the RAMS copilot.",
      href: ramsHref,
      label: "Open RAMS",
    },
    {
      title: "Permits",
      summary: "Create structured permits, manage authorisation, capture acceptance and close completed works.",
      href: permitsHref,
      label: "Open permits",
    },
    {
      title: "Contractors",
      summary: "Manage site contractor records, contacts, trade packages and linked permits, RAMS and induction records.",
      href: contractorsHref,
      label: "Open contractors",
    },
    {
      title: "Attendance",
      summary: "See who is currently on site and sign operatives in or out against their contractor record.",
      href: attendanceHref,
      label: "Open attendance",
    },
    {
      title: "Forms",
      summary: "Start or test the public site induction form flow as an operative would complete it on site.",
      href: `/form?returnTo=${formReturn}`,
      label: "Start form",
    },
    {
      title: "Edit Images",
      summary: "Edit prepared PDF image pages, print selected pages and download a finished PDF copy.",
      href: editImagesHref,
      label: "Open editor",
    },
  ];
}

export const portalActions = portalActionsForSite();

export function getPortalSite(siteId: string) {
  return portalSites.find((site) => site.id === siteId) ?? null;
}

function titleCaseStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
