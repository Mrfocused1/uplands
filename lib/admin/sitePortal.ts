export type PortalSite = {
  id: string;
  name: string;
  location: string;
  summary: string;
  status: string;
};

export type PortalAction = {
  title: string;
  summary: string;
  href: string;
  label: string;
};

export const portalSites: PortalSite[] = [
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

export const portalActions: PortalAction[] = [
  {
    title: "Inductions",
    summary: "Choose the inductee or inductor workflow, start new records, review submitted inductions and download completed PDFs.",
    href: "/admin/forms",
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
    href: "/form?returnTo=/admin/forms",
    label: "Start form",
  },
  {
    title: "Edit Images",
    summary: "Edit prepared PDF image pages, print selected pages and download a finished PDF copy.",
    href: "/edit-images",
    label: "Open editor",
  },
];

export function getPortalSite(siteId: string) {
  return portalSites.find((site) => site.id === siteId) ?? null;
}
