import { notFound } from "next/navigation";

import { RamsReview } from "@/components/admin/rams/RamsReview";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site RAMS | Uplands Admin",
};

export default async function SiteRamsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  return <RamsReview site={site} />;
}
