import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { projectConfig } from "@/config/projectConfig";

export const metadata = {
  title: "Admin Login | Uplands",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const admin = await getCurrentAdmin();
  const params = await searchParams;
  if (admin) redirect(params.next || "/admin/submissions");

  return (
    <main className="min-h-screen bg-uplands-paper px-5 py-10 text-uplands-charcoal">
      <section className="mx-auto w-full max-w-md border border-zinc-200 bg-white p-6 shadow-soft">
        <Image src={projectConfig.logoPath} alt="Uplands Construction" width={235} height={44} priority className="mb-8 h-auto w-56" />
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Admin</p>
        <h1 className="mt-2 font-slab text-3xl leading-tight">Sign In</h1>
        <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={params.next || "/admin/submissions"} />
          <label className="block">
            <span className="text-xs font-bold uppercase text-zinc-700">Username</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-zinc-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta"
            />
          </label>
          {params.error && <p className="border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">Invalid admin username or password.</p>}
          <button type="submit" className="min-h-11 w-full bg-uplands-magenta px-5 text-sm font-bold uppercase text-white">
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
