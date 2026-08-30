import { notFound } from "next/navigation";

import { RamsReview } from "@/components/admin/rams/RamsReview";
import { isContractorDatabaseSetupError, listSiteContractors, type SiteContractorSummaryRow } from "@/lib/db/contractors";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site RAMS | Uplands Admin",
};

export default async function SiteRamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ contractorId?: string; documentId?: string }>;
}) {
  const { siteId } = await params;
  const { contractorId, documentId } = await searchParams;
  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  let contractors: SiteContractorSummaryRow[] = [];
  let contractorFilter = null;
  try {
    contractors = await listSiteContractors(site.id);
    if (contractorId) {
      const contractor = contractors.find((item) => item.contractor_id === contractorId);
      contractorFilter = contractor ? { contractorId: contractor.contractor_id, name: contractor.name } : null;
    }
  } catch (error) {
    if (!isContractorDatabaseSetupError(error)) throw error;
  }

  return (
    <RamsReview
      site={site}
      contractors={contractors.map((contractor) => ({
        contractorId: contractor.contractor_id,
        name: contractor.name,
        siteStatus: contractor.site_status,
        trade: contractor.trade,
      }))}
      contractorFilter={contractorFilter}
      initialDocumentId={documentId ?? null}
    />
  );
}
