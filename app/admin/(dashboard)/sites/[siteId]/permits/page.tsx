import { notFound } from "next/navigation";

import { PermitsWorkspace } from "@/components/admin/permits/PermitsWorkspace";
import { listPermitTemplates, listPermitsBySite } from "@/lib/db/permits";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Permits | Uplands Admin",
};

export default async function SitePermitsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();

  const [templates, permits] = await Promise.all([listPermitTemplates(), listPermitsBySite(site.id)]);

  return (
    <PermitsWorkspace
      site={{ id: site.id, location: site.location, project_id: site.project_id, project_name: site.project_name }}
      templates={templates.map((template) => ({
        id: template.id,
        code: template.code,
        title: template.title,
        description: template.description,
      }))}
      initialPermits={permits.map((permit) => ({
        id: permit.id,
        permitNumber: permit.permit_number,
        templateCode: permit.template_code,
        templateTitle: permit.template_title,
        contractor: permit.contractor,
        locationOfWork: permit.location_of_work,
        validToDate: permit.valid_to_date,
        validToTime: permit.valid_to_time,
        status: permit.status,
      }))}
    />
  );
}
