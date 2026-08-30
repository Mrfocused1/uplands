import { SiteManagerPortal } from "@/components/admin/SiteManagerPortal";
import { portalSiteFromRow } from "@/lib/admin/sitePortal";
import { listSites } from "@/lib/db/sites";

export default async function AdminIndexPage() {
  const sites = await listSites();
  return <SiteManagerPortal sites={sites.map(portalSiteFromRow)} />;
}
