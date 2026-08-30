import { notFound } from "next/navigation";

import { AttendanceWorkspace } from "@/components/admin/attendance/AttendanceWorkspace";
import { isAttendanceDatabaseSetupError, listAttendanceBySite, listAttendanceOperatives } from "@/lib/db/attendance";
import { getSite } from "@/lib/db/sites";

export const metadata = {
  title: "Site Attendance | Uplands Admin",
};

export default async function SiteAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ contractorId?: string }>;
}) {
  const { siteId } = await params;
  const { contractorId } = await searchParams;
  const site = await getSite(siteId);
  if (!site) notFound();

  let records;
  let operatives;
  try {
    [records, operatives] = await Promise.all([listAttendanceBySite(site.id), listAttendanceOperatives(site.id)]);
  } catch (error) {
    if (!isAttendanceDatabaseSetupError(error)) throw error;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Attendance Setup Required</p>
        <h1 className="mt-3 font-slab text-4xl text-uplands-charcoal">Attendance Needs The Supabase Migration</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">Apply the latest Supabase migrations to enable site attendance and sign-in records.</p>
      </section>
    );
  }

  return (
    <AttendanceWorkspace
      site={{ id: site.id, location: site.location, project_id: site.project_id, project_name: site.project_name }}
      initialRecords={records.map((record) => ({
        id: record.id,
        siteId: record.site_id,
        projectId: record.project_id,
        contractorId: record.contractor_id,
        contractorName: record.contractor_name ?? "Contractor",
        operativeId: record.operative_id,
        fullName: record.full_name ?? "Operative",
        email: record.email ?? null,
        phone: record.phone ?? null,
        role: record.role ?? null,
        inductionStatus: record.induction_status,
        inductionReference: record.induction_reference ?? null,
        shift: record.shift,
        status: record.status,
        signedInAt: record.signed_in_at,
        signedInBy: record.signed_in_by,
        signedOutAt: record.signed_out_at,
        signedOutBy: record.signed_out_by,
        notes: record.notes,
      }))}
      initialOperatives={operatives.map((operative) => ({
        siteOperativeId: operative.site_operative_id,
        siteId: operative.site_id,
        projectId: operative.project_id,
        contractorId: operative.contractor_id,
        contractorName: operative.contractor_name,
        operativeId: operative.operative_id,
        fullName: operative.full_name,
        email: operative.email,
        phone: operative.phone,
        role: operative.role,
        siteStatus: operative.site_status,
        inductionStatus: operative.induction_status,
        inductionReference: operative.induction_reference,
      }))}
      initialContractorFilter={contractorId ?? ""}
    />
  );
}
