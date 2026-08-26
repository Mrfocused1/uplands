import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-uplands-paper text-uplands-charcoal">
      <AdminNav />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
