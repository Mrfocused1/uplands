import Link from "next/link";

const formWorkflows = [
  {
    title: "Inductee Form",
    summary:
      "Start, view, download, edit and fill the UHSF16.01 induction record from the inductee side. Use this when an operative needs to complete or test the site induction flow.",
    actions: [
      { label: "Start New Induction", href: "/form", primary: true },
      { label: "View Filled Inductions", href: "/admin/submissions", primary: false },
    ],
    details: ["Capture personal details, competency answers, document evidence and signature.", "Download completed induction PDFs from the admin records area."],
  },
  {
    title: "Inductor Form",
    summary:
      "Open submitted inductions for inductor review, sign-off, editing, PDF download and document adjustment before the record is filed.",
    actions: [
      { label: "Open Induction Records", href: "/admin/submissions", primary: true },
      { label: "Start New Record", href: "/form", primary: false },
    ],
    details: ["Edit inductor name, date, job title and signature on saved records.", "Review evidence uploads, adjust print crops and download the final admin-ready PDF."],
  },
];

export function AdminFormsHub() {
  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Admin Forms</p>
        <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal sm:text-5xl">Forms Workspace</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-uplands-muted">
          Manage UHSF16.01 forms from both sides of the site induction process. Start new records, open completed
          inductions, edit details, review evidence and download finished PDFs.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {formWorkflows.map((workflow) => (
          <article key={workflow.title} className="flex min-h-[360px] flex-col justify-between border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">UHSF16.01</p>
              <h2 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal">{workflow.title}</h2>
              <p className="mt-4 text-base leading-7 text-uplands-muted">{workflow.summary}</p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-700">
                {workflow.details.map((detail) => (
                  <li key={detail} className="border-l-4 border-uplands-magenta bg-uplands-paper px-4 py-3">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {workflow.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`inline-flex min-h-12 items-center justify-center px-5 text-sm font-bold uppercase ${
                    action.primary
                      ? "bg-uplands-magenta text-white hover:bg-[#8e0075]"
                      : "border border-zinc-300 text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
                  }`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
