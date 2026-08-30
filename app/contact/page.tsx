import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact | Uplands Site Manager Hub",
  description: "Contact Uplands support for help with the Uplands site operations platform.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-uplands-paper text-uplands-charcoal">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-24 w-full max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Uplands home">
            <Image
              src="/wp-content/uploads/2018/08/uplands-construction-logo.svg"
              alt="Uplands Construction"
              width={260}
              height={50}
              priority
              className="h-auto w-48 sm:w-60"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-bold uppercase text-zinc-700">
            <Link className="hover:text-uplands-magenta" href="/">
              Home
            </Link>
            <Link className="hover:text-uplands-magenta" href="/admin">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Contact</p>
          <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">Platform Support</h1>
          <p className="mt-4 text-base leading-7 text-uplands-muted">
            For help with admin access, site records, inductions, RAMS, permits or document editing, contact the Uplands support inbox.
          </p>
          <div className="mt-6 border border-zinc-200 bg-uplands-paper p-4">
            <p className="text-xs font-bold uppercase text-uplands-muted">Support Email</p>
            <a href="mailto:support@uplands.site" className="mt-1 block break-words font-din text-2xl text-uplands-magenta">
              support@uplands.site
            </a>
          </div>
        </section>

        <ContactForm />
      </main>
    </div>
  );
}
