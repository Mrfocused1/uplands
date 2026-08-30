import { notFound } from "next/navigation";

import { ContractorsWorkspace } from "@/components/admin/contractors/ContractorsWorkspace";
import { isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Contractors | Uplands Admin",
};

export default async function SiteContractorsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();

  let contractors;
  try {
    contractors = await listSiteContractors(site.id);
  } catch (error) {
    if (!isContractorDatabaseSetupError(error)) throw error;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Contractor Setup Required</p>
        <h1 className="mt-3 font-slab text-4xl text-uplands-charcoal">Contractors Need The Supabase Migration</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
          Apply the latest Supabase migrations to enable the site contractor register.
        </p>
      </section>
    );
  }

  return (
    <ContractorsWorkspace
      site={{ id: site.id, location: site.location, project_id: site.project_id, project_name: site.project_name }}
      initialContractors={contractors.map((contractor) => ({
        siteContractorId: contractor.site_contractor_id,
        siteId: contractor.site_id,
        projectId: contractor.project_id,
        contractorId: contractor.contractor_id,
        name: contractor.name,
        contractorStatus: contractor.contractor_status,
        siteStatus: contractor.site_status,
        trade: contractor.trade,
        primaryContactName: contractor.primary_contact_name,
        primaryContactEmail: contractor.primary_contact_email,
        primaryContactPhone: contractor.primary_contact_phone,
        permitCount: contractor.permit_count,
        ramsCount: contractor.rams_count,
        inductionCount: contractor.induction_count,
        createdAt: contractor.created_at,
        updatedAt: contractor.updated_at,
      }))}
    />
  );
}
