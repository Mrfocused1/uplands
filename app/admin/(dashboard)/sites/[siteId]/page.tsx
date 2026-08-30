import { notFound } from "next/navigation";

import { SiteWorkspace } from "@/components/admin/SiteWorkspace";
import { getSite, getSiteWorkspaceSummary } from "@/lib/db/sites";

export default async function AdminSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  const summary = await getSiteWorkspaceSummary(site.id);

  return <SiteWorkspace site={site} summary={summary} />;
}
