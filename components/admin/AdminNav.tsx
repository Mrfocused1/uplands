"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectConfig } from "@/config/projectConfig";

export function AdminNav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `px-1 py-2 text-sm font-bold uppercase tracking-wide transition ${
      pathname === href || (href !== "/admin/submissions" && pathname.startsWith(href))
        ? "text-uplands-magenta"
        : "text-zinc-700 hover:text-uplands-magenta"
    }`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-24 w-full max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" aria-label="Uplands home">
            <Image
              src={projectConfig.logoPath}
              alt="Uplands Construction"
              width={235}
              height={44}
              priority
              className="h-auto w-44 sm:w-56"
            />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/" className="px-1 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:text-uplands-magenta">
              Home
            </Link>
            <Link href="/form" className="px-1 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:text-uplands-magenta">
              Form
            </Link>
            <Link href="/admin/submissions" className={linkClass("/admin/submissions")}>
              Admin
            </Link>
          </nav>
        </div>
        <div className="text-right">
          <p className="font-din text-xs uppercase tracking-normal text-uplands-magenta">UHSF16.01</p>
          <h1 className="mt-1 font-slab text-lg leading-tight text-uplands-charcoal sm:text-2xl">Admin Records</h1>
        </div>
      </div>
    </header>
  );
}
