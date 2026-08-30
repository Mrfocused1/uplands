export type SiteSeed = {
  id: string;
  name: string;
  location: string;
  summary: string;
  status: "ACTIVE" | "TESTING" | "PLANNED" | "ARCHIVED";
  project: {
    id: string;
    name: string;
    reference: string;
  };
};

export const DEFAULT_SITE_SEEDS: SiteSeed[] = [
  {
    id: "newport",
    name: "Newport",
    location: "Waitrose Newport",
    summary: "Current RAMS reviews, site inductions, forms and document tools for the Newport works.",
    status: "ACTIVE",
    project: {
      id: "newport-waitrose",
      name: "Waitrose Newport",
      reference: "NEWPORT",
    },
  },
  {
    id: "balham",
    name: "Balham",
    location: "Waitrose Balham",
    summary: "Editable daily report documents and site document preparation for Balham.",
    status: "TESTING",
    project: {
      id: "balham-waitrose",
      name: "Waitrose Balham",
      reference: "BALHAM",
    },
  },
  {
    id: "plymouth",
    name: "Plymouth",
    location: "Plymouth Depot",
    summary: "Prepared for future Uplands site-management records.",
    status: "PLANNED",
    project: {
      id: "plymouth-depot",
      name: "Plymouth Depot",
      reference: "PLYMOUTH",
    },
  },
  {
    id: "bristol",
    name: "Bristol",
    location: "Bristol Retail Works",
    summary: "Prepared for future Uplands site-management records.",
    status: "PLANNED",
    project: {
      id: "bristol-retail",
      name: "Bristol Retail Works",
      reference: "BRISTOL",
    },
  },
  {
    id: "london",
    name: "London Central",
    location: "Central London Sites",
    summary: "Prepared for future Uplands site-management records.",
    status: "PLANNED",
    project: {
      id: "london-central",
      name: "Central London Sites",
      reference: "LONDON",
    },
  },
];
