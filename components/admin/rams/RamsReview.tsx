"use client";

import { useMemo, useState } from "react";

type EvidenceItem = {
  id: string;
  title: string;
  answer: "Yes" | "No" | "N/A";
  comment?: string;
  pages: string;
  href: string;
  highlight: string;
  note?: string;
};

const documents = [
  {
    title: "Source RAMS PDF",
    description: "Original CA Drillers RAMS for Waitrose Newport core holes.",
    href: "/rams/RAMS.pdf",
    action: "Open PDF",
  },
  {
    title: "Completed Sheet 1",
    description: "Method statement / risk assessment details and hazard checklist.",
    href: "/rams/rams-review-sheet-1.png",
    action: "Open Sheet 1",
  },
  {
    title: "Completed Sheet 2",
    description: "RAMS review questions with completed comments.",
    href: "/rams/rams-review-sheet-2.png",
    action: "Open Sheet 2",
  },
];

const hazardEvidence: EvidenceItem[] = [
  {
    id: "pressure-systems",
    title: "Pressure Systems",
    answer: "No",
    pages: "Pages 1-4",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Scope is core drilling through external brick and internal block wall. No pressure systems are identified.",
  },
  {
    id: "demolition",
    title: "Demolition",
    answer: "No",
    pages: "Pages 1-4",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "CAD to undertake core drilling at high level. Demolition is not part of the stated scope.",
  },
  {
    id: "hot-works",
    title: "Hot Works",
    answer: "No",
    pages: "Pages 4 and 14-15",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Works are diamond drilling/core drilling with water/dust suppression. No hot works are described.",
  },
  {
    id: "steel-erection",
    title: "Steel Erection",
    answer: "No",
    pages: "Pages 1-4",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Scope is drilling core holes through wall construction. Steel erection is not identified.",
  },
  {
    id: "work-at-height",
    title: "Work At Height",
    answer: "Yes",
    pages: "Pages 4 and 29-30",
    href: "/rams/RAMS.pdf#page=29",
    highlight: "Works are deemed as W.A.H with Uplands providing access in the form of a certified MEWP.",
  },
  {
    id: "roof-fragile",
    title: "Roof Work / Work Near Fragile Materials",
    answer: "No",
    pages: "Pages 4 and 29-30",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Work is high-level drilling from a MEWP in the rear service yard. Roof or fragile material work is not identified.",
  },
  {
    id: "temporary-works",
    title: "Temporary Works including Scaffolding",
    answer: "No",
    pages: "Pages 4 and 29-30",
    href: "/rams/RAMS.pdf#page=29",
    highlight: "Access is by certified MEWP. Scaffolding or separate temporary works are not specified.",
  },
  {
    id: "breaking-ground",
    title: "Breaking Ground / Digging",
    answer: "No",
    pages: "Pages 4 and 17-20",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Work is drilling through external brick/internal block wall. No breaking ground or digging is in the scope.",
  },
  {
    id: "excavations",
    title: "Working in Excavations",
    answer: "No",
    pages: "Pages 4 and 29",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "The RAMS mentions ground features for MEWP stability, but no work inside excavations.",
  },
  {
    id: "confined-space",
    title: "Confined Space Work",
    answer: "Yes",
    pages: "Pages 36-37",
    href: "/rams/RAMS.pdf#page=36",
    highlight: "COSHH activity details state location: In a confined Space.",
    note: "This should be confirmed because the main work scope describes a rear service yard/high-level MEWP task.",
  },
  {
    id: "lifting",
    title: "Lifting Operations",
    answer: "No",
    pages: "Pages 9, 25 and 29-30",
    href: "/rams/RAMS.pdf#page=25",
    highlight: "Manual handling and MEWP access are controlled, but no separate lifting operation is identified.",
  },
  {
    id: "overhead-services",
    title: "Overhead Services",
    answer: "No",
    pages: "Pages 17-20 and 29",
    href: "/rams/RAMS.pdf#page=29",
    highlight: "The MEWP controls say ensure the MEWP cannot impact overhead obstructions. Overhead services are not separately identified.",
  },
  {
    id: "electrical-work",
    title: "Electrical Work",
    answer: "Yes",
    pages: "Pages 17-20",
    href: "/rams/RAMS.pdf#page=17",
    highlight: "Hidden or live electrical services near to work area. All services treated as live until proven isolated.",
  },
  {
    id: "plant-equipment",
    title: "Use of Plant and Equipment",
    answer: "Yes",
    pages: "Pages 6, 15 and 26-30",
    href: "/rams/RAMS.pdf#page=26",
    highlight: "Power tools, drilling equipment and MEWP controls are identified, including inspections, competence and safe operation.",
  },
  {
    id: "pat-testing",
    title: "PAT Testing",
    answer: "No",
    pages: "Pages 6 and 26",
    href: "/rams/RAMS.pdf#page=6",
    highlight: "The RAMS requires tools to be inspected and maintained, but does not specifically identify PAT testing.",
  },
  {
    id: "restricted-access",
    title: "Restricted Access and Egress",
    answer: "Yes",
    pages: "Pages 5, 14, 23 and 33",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "Access and egress from the site shall be via designated entrance and exit routes.",
  },
  {
    id: "vehicle-plant-movements",
    title: "Vehicle / Plant Movements",
    answer: "Yes",
    pages: "Pages 23 and 29-30",
    href: "/rams/RAMS.pdf#page=23",
    highlight: "A banksman will control reversing vehicles if unavoidable. Operatives follow the site traffic management plan.",
  },
  {
    id: "segregation",
    title: "Segregation",
    answer: "Yes",
    pages: "Pages 14, 23, 26, 29 and 31",
    href: "/rams/RAMS.pdf#page=14",
    highlight: "Exclusion zones will be set up around work areas. Barriers and warning signage are specified.",
  },
  {
    id: "fire-explosion",
    title: "Fire / Explosion",
    answer: "Yes",
    pages: "Pages 17 and 39",
    href: "/rams/RAMS.pdf#page=17",
    highlight: "Hidden live services risk includes explosion. COSHH emergency response includes firefighting measures.",
  },
  {
    id: "sharp-objects",
    title: "Sharp Objects",
    answer: "Yes",
    pages: "Pages 20 and 25",
    href: "/rams/RAMS.pdf#page=20",
    highlight: "Wear Level 5 cut resistant gloves when using sharp/bladed tools.",
  },
  {
    id: "poor-ground",
    title: "Poor Ground Conditions",
    answer: "Yes",
    pages: "Pages 29-30 and 34",
    href: "/rams/RAMS.pdf#page=34",
    highlight: "Ground conditions and terrain are assessed, including firm and level surfaces for the MEWP.",
  },
  {
    id: "non-english",
    title: "Non English Speaking Operatives",
    answer: "No",
    pages: "Pages 5 and 41",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "CAD operatives are TBC. No non-English speaking operatives are identified in the RAMS.",
  },
  {
    id: "flying-particles",
    title: "Flying Particles",
    answer: "Yes",
    pages: "Pages 7-8 and 26-27",
    href: "/rams/RAMS.pdf#page=26",
    highlight: "Eye damage is identified for power tools and goggles to BS EN 166 are required.",
  },
  {
    id: "licensed-asbestos",
    title: "Licensed Asbestos Removal",
    answer: "No",
    pages: "Pages 4-5",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "Asbestos awareness is listed as competence, but asbestos removal is not part of the work scope.",
  },
  {
    id: "non-licensed-asbestos",
    title: "Non-Licensed Asbestos Removal",
    answer: "No",
    pages: "Pages 4-5",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "Asbestos awareness is listed as competence, but non-licensed asbestos removal is not identified.",
  },
  {
    id: "dust",
    title: "Dust",
    answer: "Yes",
    pages: "Pages 8, 15, 24 and 35-38",
    href: "/rams/RAMS.pdf#page=24",
    highlight: "Dusty environment, including silica dust. Water suppression, H-class extraction and FFP3 RPE are specified.",
  },
  {
    id: "noise",
    title: "Noise",
    answer: "Yes",
    pages: "Page 21",
    href: "/rams/RAMS.pdf#page=21",
    highlight: "Operation and use of tools, equipment and machinery which emit loud noise over a short period of time.",
  },
  {
    id: "vibration",
    title: "Vibration",
    answer: "Yes",
    pages: "Pages 15 and 28",
    href: "/rams/RAMS.pdf#page=28",
    highlight: "Use of vibrating tools and equipment. HAV exposure limits, training and rotation are specified.",
  },
  {
    id: "manual-handling",
    title: "Manual Handling",
    answer: "Yes",
    pages: "Pages 9 and 25",
    href: "/rams/RAMS.pdf#page=25",
    highlight: "Manual transport of equipment or materials. Kinetic lifting methods and manual handling controls are included.",
  },
  {
    id: "epoxy-resins",
    title: "Epoxy Resins",
    answer: "No",
    pages: "Pages 35-40",
    href: "/rams/RAMS.pdf#page=35",
    highlight: "COSHH assessment is for silica dust only. Epoxy resins are not identified.",
  },
  {
    id: "mma",
    title: "Methyl methacrylate (MMA)",
    answer: "No",
    pages: "Pages 35-40",
    href: "/rams/RAMS.pdf#page=35",
    highlight: "COSHH assessment is for silica dust only. Methyl methacrylate is not identified.",
  },
  {
    id: "uv",
    title: "UV (Solar) Radiation",
    answer: "No",
    pages: "Pages 4 and 29-30",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "External rear service yard work is described, but UV/solar radiation is not identified as a hazard.",
  },
  {
    id: "leptospirosis",
    title: "Leptospirosis",
    answer: "No",
    pages: "Pages 35-40",
    href: "/rams/RAMS.pdf#page=35",
    highlight: "Biological hazards such as leptospirosis are not identified in the RAMS or COSHH assessment.",
  },
  {
    id: "psittacosis",
    title: "Psittacosis",
    answer: "No",
    pages: "Pages 35-40",
    href: "/rams/RAMS.pdf#page=35",
    highlight: "Biological hazards such as psittacosis are not identified in the RAMS or COSHH assessment.",
  },
  {
    id: "needle-stick",
    title: "Needle Stick Injury",
    answer: "No",
    pages: "Pages 1-40",
    href: "/rams/RAMS.pdf#page=1",
    highlight: "Needle stick injury is not identified in the method statement, risk assessment or COSHH pages.",
  },
  {
    id: "hazardous-substances",
    title: "Hazardous Substances",
    answer: "Yes",
    pages: "Pages 35-40",
    href: "/rams/RAMS.pdf#page=35",
    highlight: "COSHH substance details identify silica dust as a serious health hazard.",
  },
  {
    id: "falls-materials",
    title: "Falls of materials",
    answer: "Yes",
    pages: "Pages 14 and 29-30",
    href: "/rams/RAMS.pdf#page=14",
    highlight: "Acro and board propping to prevent any cores from falling. Tools at height secured with retention straps.",
  },
  {
    id: "adjacent-water",
    title: "Working on / adjacent to water",
    answer: "No",
    pages: "Pages 4, 15 and 27",
    href: "/rams/RAMS.pdf#page=15",
    highlight: "Water is used for suppression/cooling and slurry control. No working on or adjacent to water is identified.",
  },
  {
    id: "adverse-weather",
    title: "Adverse weather",
    answer: "Yes",
    pages: "Pages 24, 28 and 30",
    href: "/rams/RAMS.pdf#page=30",
    highlight: "Weather conditions continually assessed before commencing with work at height and during the activity.",
  },
  {
    id: "covid",
    title: "COVID-19",
    answer: "Yes",
    pages: "Page 14",
    href: "/rams/RAMS.pdf#page=14",
    highlight: "Induction to cover site procedures for working during COVID-19 and CLC procedures.",
  },
];

const reviewEvidence: EvidenceItem[] = [
  {
    id: "q1-controls",
    title: "1. Are appropriate controls contained in the RAMS?",
    answer: "Yes",
    comment: "Controls included for drilling, WAH/MEWP, services, dust, noise, vibration, manual handling, access, segregation, emergencies and PPE.",
    pages: "Pages 14-40",
    href: "/rams/RAMS.pdf#page=14",
    highlight: "The sequence of works and risk assessment identify controls for the drilling task and supporting hazards.",
  },
  {
    id: "q2-hazards",
    title: "2. Do they cover all likely significant hazards?",
    answer: "Yes",
    comment: "Significant hazards covered. COSHH mentions confined space - confirm if applicable.",
    pages: "Pages 1-2 and 17-40",
    href: "/rams/RAMS.pdf#page=1",
    highlight: "Risk Assessment sections cover hidden/live services, hand tools, noise, dust, manual handling, power tools, vibration, MEWPs, cables and terrain.",
  },
  {
    id: "q2-permits",
    title: "2. Are Uplands Permits to Work required?",
    answer: "Yes",
    comment: "WAH / MEWP permit required by Uplands. Permit also required for live services/isolation if applicable.",
    pages: "Pages 4, 7 and 17-19",
    href: "/rams/RAMS.pdf#page=4",
    highlight: "Any permits required for W.A.H to be issued by Uplands and briefed to CAD prior to commencement.",
  },
  {
    id: "q3-scope",
    title: "3. Is the area of work and scope clearly defined?",
    answer: "Yes",
    comment: "Area and scope defined: Waitrose Newport rear service yard, high-level core drilling through external brick/internal block wall.",
    pages: "Pages 3-4",
    href: "/rams/RAMS.pdf#page=3",
    highlight: "Waitrose, Audley Road, Newport, TF10 7DS. CAD to undertake core drilling at high level within the rear service yard.",
  },
  {
    id: "q4-supervision",
    title: "4. Are supervisory and communication arrangements clearly defined?",
    answer: "Yes",
    comment: "Works Supervisor: Matty Singlehurst, Uplands Site Manager. CAD operatives TBC.",
    pages: "Pages 3, 13, 17-19 and 22",
    href: "/rams/RAMS.pdf#page=3",
    highlight: "Works Supervisor: Matty Singlehurst. CAD supervisor to be provided with site contact details for Uplands Site Manager.",
  },
  {
    id: "q5-monitoring",
    title: "5. Is responsibility for monitoring operations clearly defined?",
    answer: "Yes",
    comment: "Monitoring covered by supervision, stop-work/reassessment process and site manager notification.",
    pages: "Pages 13, 17-19 and 30",
    href: "/rams/RAMS.pdf#page=13",
    highlight: "In the event of changes from the proposed work scope, that job will be stopped and re-assessed.",
  },
  {
    id: "q6-training",
    title: "6. Are training requirements identified?",
    answer: "Yes",
    comment: "Training listed: NVQ diamond drilling/sawing, CSCS, SSSTS/SMSTS, IPAF, manual handling, abrasive wheels, asbestos awareness, face-fit and HAVS.",
    pages: "Pages 5, 8, 21, 28 and 29-30",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "Training and competence includes Diamond Drilling and Sawing NVQ, SMSTS, SSSTS, CSCS, IPAF, Manual Handling, Abrasive Wheels and Asbestos Awareness.",
  },
  {
    id: "q7-language",
    title: "7. Non English Speaking Operatives",
    answer: "N/A",
    comment: "N/A - no non-English speaking operatives identified.",
    pages: "Pages 5 and 41",
    href: "/rams/RAMS.pdf#page=5",
    highlight: "CAD operatives are TBC. The RAMS does not identify non-English speaking operatives.",
  },
  {
    id: "q8-impact",
    title: "8. Impact on contractors, visitors and public areas",
    answer: "Yes",
    comment: "Others/public assessed. Barriers, signage, exclusion zones, pedestrian segregation and traffic controls included.",
    pages: "Pages 14, 18, 23, 26, 29-31 and 34",
    href: "/rams/RAMS.pdf#page=23",
    highlight: "Other site operatives and public are persons at risk. Barriers, signage, pedestrian routes and traffic management are included.",
  },
  {
    id: "q9-emergency",
    title: "9. Are emergency arrangements adequately addressed?",
    answer: "Yes",
    comment: "Emergency procedures, first aid, nearest A&E, out-of-hours communication and COSHH emergency response included.",
    pages: "Pages 11-12, 17, 22 and 39",
    href: "/rams/RAMS.pdf#page=12",
    highlight: "Emergency procedures are covered during induction. Nearest A&E is Princess Royal Hospital, Apley Castle, Telford.",
  },
  {
    id: "q10-ppe",
    title: "10. Has appropriate PPE been identified?",
    answer: "Yes",
    comment: "PPE identified: head, eye, ear, gloves, safety footwear, hi-vis and FFP3 RPE.",
    pages: "Pages 7-8, 24 and 38",
    href: "/rams/RAMS.pdf#page=7",
    highlight: "PPE requirements include ear protection, goggles, gloves, safety footwear, head protection, hi-vis and FFP3 respiratory equipment.",
  },
  {
    id: "q11-environment",
    title: "11. Are environmental aspects adequately addressed?",
    answer: "Yes",
    comment: "Waste, slurry/water control, dust suppression, spillages, COSHH disposal and correct waste streams addressed.",
    pages: "Pages 10, 14-15, 24, 27 and 39-40",
    href: "/rams/RAMS.pdf#page=10",
    highlight: "Waste materials are deposited into the correct skip/bin. Slurry, water suppression, spillages and disposal are controlled.",
  },
  {
    id: "q12-further",
    title: "12. Is there anything else the RAMS needs to address?",
    answer: "No",
    comment: "No further comments.",
    pages: "Pages 1-41",
    href: "/rams/RAMS.pdf#page=1",
    highlight: "The RAMS was reviewed as A - No Comments, Satisfactory, with significant controls identified.",
  },
];

function answerClass(answer: EvidenceItem["answer"]) {
  if (answer === "Yes") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (answer === "No") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function EvidenceAccordion({ items }: { items: EvidenceItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-uplands-paper"
              aria-expanded={isOpen}
            >
              <span className="min-w-0">
                <span className="block font-din text-sm text-uplands-charcoal">{item.title}</span>
                <span className="mt-1 block text-xs text-uplands-muted">RAMS reference: {item.pages}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={`rounded-sm px-2.5 py-1 text-xs font-bold ring-1 ${answerClass(item.answer)}`}>{item.answer}</span>
                <span className="text-lg leading-none text-uplands-magenta">{isOpen ? "-" : "+"}</span>
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4">
                {item.comment && (
                  <p className="text-sm text-zinc-800">
                    <span className="font-bold">Comment:</span> {item.comment}
                  </p>
                )}
                <p className="mt-3 text-sm text-zinc-800">
                  <span className="font-bold">Highlighted reference:</span>{" "}
                  <mark className="bg-yellow-100 px-1 text-zinc-950">{item.highlight}</mark>
                </p>
                {item.note && <p className="mt-3 border-l-4 border-amber-400 bg-white p-3 text-sm text-amber-900">{item.note}</p>}
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-bold text-uplands-magenta hover:text-[#8e0075]"
                >
                  Open referenced RAMS page
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RamsReview() {
  const [showEvidence, setShowEvidence] = useState(false);
  const [activeTab, setActiveTab] = useState<"hazards" | "questions">("questions");

  const activeItems = useMemo(() => (activeTab === "questions" ? reviewEvidence : hazardEvidence), [activeTab]);

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Admin</p>
            <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">RAMS</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-uplands-muted">
              CA Drillers Ltd RAMS review for Waitrose Newport core holes, including the completed Uplands review sheets and the evidence trail for each answer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEvidence((value) => !value)}
            className="min-h-11 bg-uplands-magenta px-5 text-sm font-bold uppercase text-white transition hover:bg-[#8e0075]"
            aria-expanded={showEvidence}
          >
            {showEvidence ? "Hide Evidence" : "More"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {documents.map((document) => (
          <article key={document.href} className="border border-zinc-200 bg-white p-5 shadow-soft">
            <h2 className="font-din text-lg text-uplands-charcoal">{document.title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-uplands-muted">{document.description}</p>
            <a
              href={document.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-10 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta transition hover:bg-uplands-magenta hover:text-white"
            >
              {document.action}
            </a>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <figure className="border border-zinc-200 bg-white p-4 shadow-soft">
          <figcaption className="mb-3 font-din text-sm uppercase text-uplands-charcoal">Completed Sheet 1</figcaption>
          <img src="/rams/rams-review-sheet-1.png" alt="Completed RAMS review sheet 1" className="w-full border border-zinc-200" />
        </figure>
        <figure className="border border-zinc-200 bg-white p-4 shadow-soft">
          <figcaption className="mb-3 font-din text-sm uppercase text-uplands-charcoal">Completed Sheet 2</figcaption>
          <img src="/rams/rams-review-sheet-2.png" alt="Completed RAMS review sheet 2" className="w-full border border-zinc-200" />
        </figure>
      </section>

      {showEvidence && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-slab text-2xl text-uplands-charcoal">Answer Evidence</h2>
              <p className="mt-1 text-sm text-uplands-muted">Open a row to see the RAMS page reference and the relevant highlighted wording.</p>
            </div>
            <div className="flex border border-zinc-300 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`px-4 py-2 text-sm font-bold uppercase ${
                  activeTab === "questions" ? "bg-uplands-charcoal text-white" : "text-zinc-700 hover:text-uplands-magenta"
                }`}
              >
                Sheet 2 Questions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("hazards")}
                className={`px-4 py-2 text-sm font-bold uppercase ${
                  activeTab === "hazards" ? "bg-uplands-charcoal text-white" : "text-zinc-700 hover:text-uplands-magenta"
                }`}
              >
                Sheet 1 Hazards
              </button>
            </div>
          </div>
          <EvidenceAccordion items={activeItems} />
        </section>
      )}
    </div>
  );
}
