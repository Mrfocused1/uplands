"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      pathname === href || (href !== "/admin/submissions" && pathname.startsWith(href))
        ? "bg-white/20 text-white"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/submissions" className="text-base font-bold tracking-tight">
            Uplands Admin
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/admin/submissions" className={linkClass("/admin/submissions")}>
              Submissions
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70">{username}</span>
          <button
            onClick={logout}
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
