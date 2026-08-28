"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectConfig } from "@/config/projectConfig";

export function AdminNav({ adminName }: { adminName?: string }) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `px-1 py-2 text-sm font-bold uppercase tracking-wide transition ${
      pathname === href || (href !== "/admin" && href !== "/admin/submissions" && pathname.startsWith(href))
        ? "text-uplands-magenta"
        : "text-zinc-700 hover:text-uplands-magenta"
    }`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:min-h-24 sm:px-8 sm:py-5">
        <div className="flex items-center gap-7">
          <Link href="/" aria-label="Uplands home">
            <Image
              src={projectConfig.logoPath}
              alt="Uplands Construction"
              width={235}
              height={44}
              priority
              className="h-auto w-36 sm:w-56"
            />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/" className="px-1 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:text-uplands-magenta">
              Home
            </Link>
            <Link href="/form" className="px-1 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:text-uplands-magenta">
              Form
            </Link>
            <Link href="/admin" className={linkClass("/admin")}>
              Sites
            </Link>
            <Link href="/admin/submissions" className={linkClass("/admin/submissions")}>
              Inductions
            </Link>
            <Link href="/admin/rams" className={linkClass("/admin/rams")}>
              RAMS
            </Link>
            <Link href="/edit-images" className={linkClass("/edit-images")}>
              Edit Images
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-din text-xs uppercase tracking-normal text-uplands-magenta">UHSF16.01</p>
            <h1 className="mt-1 hidden font-slab text-lg leading-tight text-uplands-charcoal sm:block sm:text-2xl">Admin Records</h1>
            {adminName && <p className="hidden text-xs font-bold uppercase text-zinc-500 sm:block">{adminName}</p>}
          </div>
          {adminName && (
            <form action="/api/admin/logout" method="post" className="hidden md:block">
              <button type="submit" className="border border-zinc-300 px-3 py-2 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta">
                Sign Out
              </button>
            </form>
          )}
          <details className="group relative md:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none flex-col items-center justify-center gap-1.5 border border-zinc-200 bg-white shadow-sm marker:hidden"
              aria-label="Open admin navigation menu"
            >
              <span className="h-0.5 w-6 bg-zinc-800" />
              <span className="h-0.5 w-6 bg-zinc-800" />
              <span className="h-0.5 w-6 bg-zinc-800" />
            </summary>
            <nav className="absolute right-0 top-14 z-50 w-64 border border-zinc-200 bg-white p-4 text-base font-bold uppercase tracking-wide text-zinc-700 shadow-soft">
              <Link className="block py-3 hover:text-uplands-magenta" href="/">
                Home
              </Link>
              <Link className="block py-3 hover:text-uplands-magenta" href="/form">
                Form
              </Link>
              <Link className={`${linkClass("/admin")} block py-3`} href="/admin">
                Sites
              </Link>
              <Link className={`${linkClass("/admin/submissions")} block py-3`} href="/admin/submissions">
                Inductions
              </Link>
              <Link className={`${linkClass("/admin/rams")} block py-3`} href="/admin/rams">
                RAMS
              </Link>
              <Link className={`${linkClass("/edit-images")} block py-3`} href="/edit-images">
                Edit Images
              </Link>
              {adminName && (
                <form action="/api/admin/logout" method="post">
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
