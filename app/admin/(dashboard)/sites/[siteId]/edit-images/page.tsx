import { notFound } from "next/navigation";

import { EditablePdfWorkspace } from "@/components/admin/edit-images/EditablePdfWorkspace";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Edit Images | Uplands Admin",
};

export default async function SiteEditImagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  return <EditablePdfWorkspace />;
}
