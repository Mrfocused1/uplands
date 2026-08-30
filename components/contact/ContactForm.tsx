"use client";

import { FormEvent, useState } from "react";

const supportEmail = "support@uplands.site";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const site = String(form.get("site") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const subject = site ? `Uplands support request - ${site}` : "Uplands support request";
    const body = [`Name: ${name}`, `Email: ${email}`, site ? `Site / project: ${site}` : "", "", "Message:", message].filter(Boolean).join("\n");

    const params = new URLSearchParams({ subject, body });
    setSent(true);
    window.location.href = `mailto:${supportEmail}?${params.toString()}`;
  }

  return (
    <form action={`mailto:${supportEmail}`} method="post" encType="text/plain" onSubmit={submit} className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-uplands-magenta">Support Request</p>
      <h2 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal">Contact Uplands Support</h2>
      <p className="mt-3 text-sm leading-6 text-uplands-muted">
        Submit the form to open an email draft addressed to {supportEmail}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-xs font-bold uppercase text-zinc-700">Name</span>
          <input name="name" required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-uplands-magenta" />
        </label>
        <label>
          <span className="text-xs font-bold uppercase text-zinc-700">Email</span>
          <input name="email" type="email" required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-uplands-magenta" />
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-bold uppercase text-zinc-700">Site / Project</span>
          <input name="site" className="mt-1 min-h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-uplands-magenta" />
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-bold uppercase text-zinc-700">Message</span>
          <textarea name="message" required className="mt-1 min-h-36 w-full border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-uplands-magenta" />
        </label>
      </div>

      {sent && <p className="mt-4 border-l-4 border-uplands-magenta bg-uplands-paper p-3 text-sm font-bold text-uplands-charcoal">Your email draft has been opened.</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="min-h-12 bg-uplands-magenta px-5 text-sm font-bold uppercase text-white transition hover:bg-[#8e0075]">
          Email Support
        </button>
        <a href={`mailto:${supportEmail}`} className="inline-flex min-h-12 items-center justify-center border border-zinc-300 px-5 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta">
          Open Email
        </a>
      </div>
    </form>
  );
}
