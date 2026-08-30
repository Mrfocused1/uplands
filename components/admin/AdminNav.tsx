"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectConfig } from "@/config/projectConfig";

export function AdminNav({ adminName }: { adminName?: string }) {
  const pathname = usePathname();
  const isSiteSelector = pathname === "/admin";
  const siteId = pathname.match(/^\/admin\/sites\/([^/]+)/)?.[1];
  const formsHref = siteId ? `/admin/sites/${siteId}/forms` : "/admin/forms";
  const ramsHref = siteId ? `/admin/sites/${siteId}/rams` : "/admin/rams";
  const permitsHref = siteId ? `/admin/sites/${siteId}/permits` : "/admin";
  const contractorsHref = siteId ? `/admin/sites/${siteId}/contractors` : "/admin";
  const attendanceHref = siteId ? `/admin/sites/${siteId}/attendance` : "/admin";
  const editImagesHref = siteId ? `/admin/sites/${siteId}/edit-images` : "/edit-images";

  const linkClass = (href: string) =>
    `whitespace-nowrap text-sm font-bold uppercase tracking-wide transition ${
      pathname === href || (href !== "/admin" && href !== "/admin/submissions" && pathname.startsWith(href))
        ? "text-uplands-magenta"
        : "text-zinc-700 hover:text-uplands-magenta"
    }`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:min-h-24 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center">
          <Link href="/" aria-label="Uplands home">
            <Image
              src={projectConfig.logoPath}
              alt="Uplands Construction"
              width={235}
              height={44}
              priority
              className="h-auto w-36 sm:w-48 xl:w-56"
            />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3 xl:gap-4">
          <details className="group relative">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none flex-col items-center justify-center gap-1.5 border border-zinc-200 bg-white shadow-sm marker:hidden"
              aria-label="Open admin navigation menu"
            >
              <span className="h-0.5 w-6 bg-zinc-800" />
              <span className="h-0.5 w-6 bg-zinc-800" />
              <span className="h-0.5 w-6 bg-zinc-800" />
            </summary>
            <nav className="absolute right-0 top-14 z-50 w-72 border border-zinc-200 bg-white p-4 text-base font-bold uppercase tracking-wide text-zinc-700 shadow-soft">
              {adminName && <p className="border-b border-zinc-200 pb-3 text-xs text-zinc-500">{adminName}</p>}
              <Link className="block py-3 hover:text-uplands-magenta" href="/">
                Home
              </Link>
              <Link className="block py-3 hover:text-uplands-magenta" href="/contact">
                Contact
              </Link>
              {!isSiteSelector && (
                <>
                  <Link className={`${linkClass("/admin")} block py-3`} href="/admin">
                    Change Site
                  </Link>
                  <Link className={`${linkClass(formsHref)} block py-3`} href={formsHref}>
                    Inductions
                  </Link>
                  <Link className={`${linkClass(ramsHref)} block py-3`} href={ramsHref}>
                    RAMS
                  </Link>
                  <Link className={`${linkClass(permitsHref)} block py-3`} href={permitsHref}>
                    Permits
                  </Link>
                  <Link className={`${linkClass(contractorsHref)} block py-3`} href={contractorsHref}>
                    Contractors
                  </Link>
                  <Link className={`${linkClass(attendanceHref)} block py-3`} href={attendanceHref}>
                    Attendance
                  </Link>
                  <Link className={`${linkClass(editImagesHref)} block py-3`} href={editImagesHref}>
                    Edit Images
                  </Link>
                </>
              )}
              {adminName && (
                <form action="/api/admin/logout" method="post" className="border-t border-zinc-200 pt-2">
                  <button type="submit" className="block w-full py-3 text-left hover:text-uplands-magenta">
                    Sign Out
                  </button>
                </form>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
