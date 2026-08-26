import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
