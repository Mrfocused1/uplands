import { AdminNav } from "@/components/admin/AdminNav";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-uplands-paper text-uplands-charcoal">
      <AdminNav adminName={admin.displayName} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
