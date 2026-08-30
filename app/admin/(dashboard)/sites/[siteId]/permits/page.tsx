import { notFound } from "next/navigation";

import { PermitsWorkspace } from "@/components/admin/permits/PermitsWorkspace";
import { isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";
import { isPermitDatabaseSetupError, listPermitTemplates, listPermitsBySite } from "@/lib/db/permits";
import { listRamsDocuments } from "@/lib/db/rams";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Permits | Uplands Admin",
};

export default async function SitePermitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ contractorId?: string; permitId?: string }>;
}) {
  const { siteId } = await params;
  const { contractorId, permitId } = await searchParams;
  const site = await getSite(siteId);
  if (!site) notFound();

  let templates;
  let permits;
  let contractors;
  let ramsDocuments;
  try {
    [templates, permits, contractors, ramsDocuments] = await Promise.all([listPermitTemplates(), listPermitsBySite(site.id), listSiteContractors(site.id), listRamsDocuments({ siteId: site.id })]);
  } catch (error) {
    if (!isPermitDatabaseSetupError(error) && !isContractorDatabaseSetupError(error)) throw error;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Permit Setup Required</p>
        <h1 className="mt-3 font-slab text-4xl text-uplands-charcoal">Permits Need The Supabase Migrations</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
          The permit workspace is deployed, but the production Supabase database does not yet have the permit and contractor tables. Apply the latest Supabase migrations to enable editable permits.
        </p>
      </section>
    );
  }

  const contractorFilter = contractorId ? contractors.find((contractor) => contractor.contractor_id === contractorId) ?? null : null;

  return (
    <PermitsWorkspace
      site={{ id: site.id, location: site.location, project_id: site.project_id, project_name: site.project_name }}
      templates={templates.map((template) => ({
        id: template.id,
        code: template.code,
        title: template.title,
        description: template.description,
      }))}
      contractors={contractors.map((contractor) => ({
        contractorId: contractor.contractor_id,
        name: contractor.name,
        siteStatus: contractor.site_status,
        trade: contractor.trade,
      }))}
      ramsDocuments={ramsDocuments.map((document) => ({
        id: document.id,
        title: document.title,
        contractorId: document.contractor_id,
        contractor: document.contractor,
        documentReference: document.document_reference,
        revision: document.revision,
        processingStatus: document.processing_status,
      }))}
      initialPermits={permits.map((permit) => ({
        id: permit.id,
        permitNumber: permit.permit_number,
        contractorId: permit.contractor_id,
        ramsDocumentId: permit.rams_document_id,
        templateCode: permit.template_code,
        templateTitle: permit.template_title,
        contractor: permit.contractor,
        locationOfWork: permit.location_of_work,
        validToDate: permit.valid_to_date,
        validToTime: permit.valid_to_time,
        status: permit.status,
      }))}
      initialSelectedPermitId={permitId ?? null}
      contractorFilter={
        contractorFilter
          ? {
              contractorId: contractorFilter.contractor_id,
              name: contractorFilter.name,
            }
          : null
      }
    />
  );
}
