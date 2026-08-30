import { notFound } from "next/navigation";

import { HandoverWorkspace } from "@/components/admin/handovers/HandoverWorkspace";
import { isHandoverDatabaseSetupError, listHandoversBySite } from "@/lib/db/handovers";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Handover | Uplands Admin",
};

export default async function SiteHandoverPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();

  let handovers;
  try {
    handovers = await listHandoversBySite(site.id);
  } catch (error) {
    if (!isHandoverDatabaseSetupError(error)) throw error;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Handover Setup Required</p>
        <h1 className="mt-3 font-slab text-4xl text-uplands-charcoal">Handover Needs The Supabase Migration</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Apply the latest Supabase migrations to enable day and night handover records.</p>
      </section>
    );
  }

  return (
    <HandoverWorkspace
      site={{ id: site.id, location: site.location, project_id: site.project_id, project_name: site.project_name }}
      initialHandovers={handovers.map((handover) => ({
        id: handover.id,
        siteId: handover.site_id,
        projectId: handover.project_id,
        handoverDate: handover.handover_date,
        shift: handover.shift,
        status: handover.status,
        managerName: handover.manager_name,
        summary: handover.summary,
        workCompleted: handover.work_completed,
        contractorsPresent: handover.contractors_present,
        permitsSummary: handover.permits_summary,
        issues: handover.issues,
        deliveries: handover.deliveries,
        outstandingActions: handover.outstanding_actions,
        nextShiftNotes: handover.next_shift_notes,
        submittedAt: handover.submitted_at,
        submittedBy: handover.submitted_by,
        acknowledgedAt: handover.acknowledged_at,
        acknowledgedBy: handover.acknowledged_by,
        createdBy: handover.created_by,
        createdAt: handover.created_at,
        updatedAt: handover.updated_at,
      }))}
    />
  );
}
