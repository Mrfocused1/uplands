import { notFound } from "next/navigation";

import { AdminFormsHub } from "@/components/admin/AdminFormsHub";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Forms | Uplands Admin",
};

export default async function SiteFormsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  return <AdminFormsHub site={site} />;
}
