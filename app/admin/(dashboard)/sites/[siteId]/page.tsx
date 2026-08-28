import { notFound } from "next/navigation";

import { SiteWorkspace } from "@/components/admin/SiteWorkspace";
import { getPortalSite } from "@/lib/admin/sitePortal";

export default async function AdminSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = getPortalSite(siteId);

  if (!site) {
    notFound();
  }

  return <SiteWorkspace site={site} />;
}
