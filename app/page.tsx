import Image from "next/image";
import Link from "next/link";

const heroSlides = [
  "/wp-content/uploads/2019/03/uplands-banner-slide-02-prog.jpg",
  "/wp-content/uploads/2019/03/uplands-banner-slide-03-prog.jpg",
  "/wp-content/uploads/2025/02/Home-Page-Slider-Images-Master_0000_Home-Page-Slider-7-scaled.jpg",
  "/wp-content/uploads/2025/02/Home-Page-Slider-Crane-scaled.jpg",
  "/wp-content/uploads/2025/02/Home-Page-Slider-Images-Master_0000_Home-Page-Slider-8-scaled.jpg",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-uplands-charcoal">
      <header className="bg-white">
        <div className="mx-auto flex min-h-28 w-full max-w-7xl items-center justify-between gap-6 px-5 py-6 sm:px-8 lg:min-h-36">
          <Link href="/" aria-label="Uplands home">
            <Image
              src="/wp-content/uploads/2018/08/uplands-construction-logo.svg"
              alt="Uplands Construction"
              width={320}
              height={62}
              className="h-auto w-52 sm:w-64 lg:w-80"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wide text-zinc-700 md:flex">
            <Link className="hover:text-uplands-magenta" href="/admin">
              Admin
            </Link>
            <Link className="hover:text-uplands-magenta" href="/contact">
              Contact
            </Link>
            <Link className="hover:text-uplands-magenta" href="/form">
              Get Started
            </Link>
          </nav>

          <details className="group relative md:hidden">
            <summary
              className="flex h-12 w-12 cursor-pointer list-none flex-col items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white shadow-sm marker:hidden"
              aria-label="Open navigation menu"
            >
              <span className="h-0.5 w-7 bg-zinc-800" />
              <span className="h-0.5 w-7 bg-zinc-800" />
              <span className="h-0.5 w-7 bg-zinc-800" />
            </summary>
            <div className="absolute right-0 top-14 z-30 w-64 bg-white p-5 text-base font-bold uppercase tracking-wide text-zinc-700 shadow-soft">
              <Link className="block py-3 hover:text-uplands-magenta" href="/admin">
                Admin
              </Link>
              <Link className="block py-3 hover:text-uplands-magenta" href="/contact">
                Contact
              </Link>
              <Link className="mt-3 block bg-uplands-magenta px-4 py-3 text-center text-white" href="/form">
                Get Started
              </Link>
            </div>
          </details>
        </div>
      </header>

      <main>
        <section className="relative min-h-[560px] overflow-hidden bg-zinc-900 sm:min-h-[620px]">
          <div className="absolute inset-0" aria-hidden="true">
            {heroSlides.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt=""
                fill
                priority={index === 0}
                className="absolute inset-0 h-full w-full object-cover opacity-0 [animation:heroFade_25s_infinite]"
                style={{ animationDelay: `${index * 5}s` }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />

          <div className="relative mx-auto flex min-h-[560px] w-full max-w-7xl items-center px-5 py-16 sm:min-h-[620px] sm:px-8">
            <div className="max-w-3xl text-white">
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-white/80">Uplands</p>
              <h1 className="font-din text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">Site Manager Efficiency Hub</h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-white/90 sm:text-2xl">
                One place for site teams to manage inductions, RAMS reviews, searchable documents and daily site records without losing time to admin.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/admin"
                  className="inline-flex min-h-14 items-center justify-center bg-uplands-magenta px-8 py-4 text-base font-bold uppercase tracking-wide text-white transition hover:bg-[#8e0075]"
                >
                  Open Admin Hub
                </Link>
                <a
                  href="#process"
                  className="inline-flex min-h-14 items-center justify-center border border-white/70 px-8 py-4 text-base font-bold uppercase tracking-wide text-white transition hover:bg-white hover:text-uplands-charcoal"
                >
                  View Tools
                </a>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3" aria-hidden="true">
            {heroSlides.map((src, index) => (
              <span
                key={src}
                className={`h-3 w-3 rounded-full ${index === 0 ? "bg-uplands-magenta" : "bg-black/60"}`}
              />
            ))}
          </div>
        </section>

        <section id="process" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-uplands-magenta">Site control</p>
              <h2 className="mt-4 font-slab text-4xl leading-tight sm:text-5xl">
                Faster decisions, cleaner records and less chasing paperwork.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-8 text-uplands-muted">
              <p>
                The admin hub gives site managers a site-first workspace for the records they need every day: live
                inductions, completed forms, contractor RAMS, review evidence and editable document outputs.
              </p>
              <p>
                It keeps key workflows accessible from desktop and mobile, so teams can find the right site, open the
                right tool and move from review to action without digging through folders or email chains.
              </p>
            </div>
          </div>
        </section>

        <section id="forms" className="bg-uplands-paper px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-uplands-magenta">Management tools</p>
              <h2 className="mt-4 font-slab text-4xl leading-tight sm:text-5xl">Built around the way site managers work.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ["Site selection", "Start from the correct project and open the relevant Uplands workflows for that site."],
                ["RAMS intelligence", "Review contractor RAMS, search evidence, open source PDFs and check completed review forms."],
                ["Induction records", "Capture UHSF16.01 details, evidence, declarations and signatures with admin-ready outputs."],
              ].map(([title, copy]) => (
                <article key={title} className="bg-white p-7 shadow-soft">
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-4 leading-7 text-uplands-muted">{copy}</p>
                </article>
              ))}
            </div>
            <Link
              href="/admin"
              className="mt-10 inline-flex min-h-14 items-center justify-center bg-uplands-magenta px-8 py-4 text-base font-bold uppercase tracking-wide text-white transition hover:bg-[#8e0075]"
            >
              Open Admin Hub
            </Link>
          </div>
        </section>
      </main>

      <footer id="support" className="bg-white px-5 py-10 text-sm text-uplands-muted sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Uplands · Constructing Change</p>
          <p>Site-manager hub for inductions, RAMS and document records</p>
        </div>
      </footer>
    </div>
  );
}
