/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";

import ramsData from "@/config/ramsReviews.json";
import { RamsDocumentIntelligence, type LegacyRamsReview } from "@/components/admin/rams/RamsDocumentIntelligence";

type Answer = "Yes" | "No" | "N/A";
type StatusCode = "A" | "B" | "C";
type DocumentType = "image" | "pdf" | "file";

type RamsDocument = {
  title: string;
  description: string;
  href: string;
  type: DocumentType;
};

type RamsForm = {
  id: string;
  company: string;
  account: string;
  site: string;
  title: string;
  status: StatusCode;
  summary: string;
  generalComments: string;
  sourceRef?: string;
  documents: RamsDocument[];
  downloadHref: string;
  frontHref?: string;
  backHref?: string;
  pressureSystems: Answer;
  hazardsYes: string[];
  questions: [string, Answer, string][];
};

type EvidenceItem = {
  id: string;
  title: string;
  answer: Answer;
  comment?: string;
};

const forms = ramsData.forms as RamsForm[];

const hazardLabels = [
  "Pressure Systems",
  "Demolition",
  "Hot Works",
  "Steel Erection",
  "Work At Height",
  "Roof Work / Work Near Fragile Materials",
  "Temporary Works including Scaffolding",
  "Breaking Ground / Digging",
  "Working in Excavations",
  "Confined Space Work",
  "Lifting Operations",
  "Overhead Services",
  "Electrical Work",
  "Use of Plant and Equipment",
  "PAT Testing",
  "Restricted Access and Egress",
  "Vehicle / Plant Movements",
  "Segregation",
  "Fire / Explosion",
  "Sharp Objects",
  "Poor Ground Conditions",
  "Non English Speaking Operatives",
  "Flying Particles",
  "Licensed Asbestos Removal",
  "Non-Licensed Asbestos Removal",
  "Dust",
  "Noise",
  "Vibration",
  "Manual Handling",
  "Epoxy Resins",
  "Methyl methacrylate (MMA)",
  "UV (Solar) Radiation",
  "Leptospirosis",
  "Psittacosis",
  "Needle Stick Injury",
  "Hazardous Substances",
  "Falls of materials",
  "Working on / adjacent to water",
  "Adverse weather",
  "COVID-19",
];

const questionText: Record<string, string> = {
  q1: "1. Are appropriate controls contained in the RAMS?",
  q2: "2. Do they cover all likely significant hazards?",
  q2p: "2. Are Uplands Permits to Work required?",
  q3: "3. Is the area of work and scope clearly defined?",
  q4: "4. Are supervisory and communication arrangements clearly defined?",
  q5: "5. Is responsibility for monitoring operations clearly defined?",
  q6: "6. Are training requirements identified?",
  q7: "7. Non-English speaking operative arrangements",
  q8: "8. Impact on contractors, visitors and public areas",
  q9: "9. Are emergency arrangements adequately addressed?",
  q10: "10. Has appropriate PPE been identified?",
  q11: "11. Are environmental aspects adequately addressed?",
  q12: "12. Does the RAMS need anything else addressed?",
};

function statusText(status: StatusCode) {
  if (status === "A") return "No comments";
  if (status === "B") return "Minor comments";
  return "Revise";
}

function statusClass(status: StatusCode) {
  if (status === "A") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "B") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function answerClass(answer: Answer) {
  if (answer === "Yes") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (answer === "No") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function documentsForForm(form: RamsForm): RamsDocument[] {
  const reviewPages: RamsDocument[] = [];
  if (form.frontHref) {
    reviewPages.push({
      title: "RAMS REVIEW FORM Front Page",
      description: "Method statement / risk assessment details and hazard checklist.",
      href: form.frontHref,
      type: "image",
    });
  }
  if (form.backHref) {
    reviewPages.push({
      title: "RAMS REVIEW FORM Back Page",
      description: "RAMS review questions with completed comments.",
      href: form.backHref,
      type: "image",
    });
  }
  return [...form.documents, ...reviewPages];
}

function EvidenceAccordion({ items }: { items: EvidenceItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="border border-zinc-200 bg-white p-4 text-sm text-uplands-muted">Open the completed review form pages for the recorded comments.</p>;
  }

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
                {item.comment && <span className="mt-1 block truncate text-xs text-uplands-muted">{item.comment}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={`rounded-sm px-2.5 py-1 text-xs font-bold ring-1 ${answerClass(item.answer)}`}>{item.answer}</span>
                <span className="text-lg leading-none text-uplands-magenta">{isOpen ? "-" : "+"}</span>
              </span>
            </button>
            {isOpen && item.comment && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4">
                <p className="text-sm leading-6 text-zinc-800">{item.comment}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RamsReview() {
  const [activeTab, setActiveTab] = useState<"hazards" | "questions">("questions");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<RamsDocument | null>(null);
  const [uploadedWorkspaceActive, setUploadedWorkspaceActive] = useState(false);

  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedFormId) ?? null, [selectedFormId]);

  const questionItems = useMemo<EvidenceItem[]>(() => {
    if (!selectedForm) return [];
    return selectedForm.questions.map(([id, answer, comment]) => ({
      id,
      title: questionText[id] ?? id,
      answer,
      comment,
    }));
  }, [selectedForm]);

  const hazardItems = useMemo<EvidenceItem[]>(() => {
    if (!selectedForm) return [];
    const yes = new Set(selectedForm.hazardsYes);
    return hazardLabels.map((label) => ({
      id: label,
      title: label,
      answer: label === "Pressure Systems" ? selectedForm.pressureSystems : yes.has(label) ? "Yes" : "No",
    }));
  }, [selectedForm]);

  const activeItems = activeTab === "questions" ? questionItems : hazardItems;

  return (
    <div className="space-y-8">
      <section className="border border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Admin</p>
            <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">RAMS</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-uplands-muted">
              Review company RAMS submissions, open source documents, view completed review form pages, and download completed review forms.
            </p>
          </div>
        </div>
      </section>

      <RamsDocumentIntelligence legacyReviews={forms as LegacyRamsReview[]} onWorkspaceChange={setUploadedWorkspaceActive} />

      {!uploadedWorkspaceActive && !selectedForm && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-slab text-2xl text-uplands-charcoal">RAMS Forms</h2>
              <p className="mt-1 text-sm text-uplands-muted">Select a company to open its current RAMS review.</p>
            </div>
            <span className="text-xs font-bold uppercase text-uplands-muted">{forms.length} forms</span>
          </div>
          <div className="divide-y divide-zinc-200 border border-zinc-200">
            {forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => setSelectedFormId(form.id)}
                className="grid w-full gap-3 bg-white px-4 py-4 text-left transition hover:bg-uplands-paper sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{form.company}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{form.title}</span>
                  <span className="mt-1 block text-xs text-uplands-muted">{form.summary}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`px-2.5 py-1 text-xs font-bold uppercase ring-1 ${statusClass(form.status)}`}>
                    {form.status}: {statusText(form.status)}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-bold uppercase text-uplands-magenta ring-1 ring-uplands-magenta">View</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!uploadedWorkspaceActive && selectedForm && (
        <>
          <section className="border border-zinc-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Selected RAMS</p>
                <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedForm.company}</h2>
                <p className="mt-1 text-sm text-uplands-muted">{selectedForm.title}</p>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-800">{selectedForm.generalComments}</p>
                {selectedForm.sourceRef && <p className="mt-2 text-xs text-uplands-muted">Review reference: {selectedForm.sourceRef}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  href={selectedForm.downloadHref}
                  download
                  className="inline-flex min-h-10 items-center border border-uplands-magenta bg-uplands-magenta px-4 text-sm font-bold uppercase text-white transition hover:bg-[#8e0075]"
                >
                  Download RAMS Review Form
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormId(null);
                  }}
                  className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta"
                >
                  Close
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {documentsForForm(selectedForm).map((document) => (
              <article key={document.href} className="border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-din text-lg text-uplands-charcoal">{document.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-uplands-muted">{document.description}</p>
                {document.type === "file" ? (
                  <a
                    href={document.href}
                    download
                    className="mt-4 inline-flex min-h-10 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta transition hover:bg-uplands-magenta hover:text-white"
                  >
                    Download
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewDocument(document)}
                    className="mt-4 inline-flex min-h-10 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta transition hover:bg-uplands-magenta hover:text-white"
                  >
                    View
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}

      {!uploadedWorkspaceActive && selectedForm && (
        <section className="border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-slab text-2xl text-uplands-charcoal">Review Evidence</h2>
              <p className="mt-1 text-sm text-uplands-muted">Use this as a quick check against the completed front and back form pages.</p>
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

      {previewDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={previewDocument.title}
          onClick={() => setPreviewDocument(null)}
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-zinc-200 bg-white shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3">
              <h2 className="font-din text-base text-uplands-charcoal sm:text-lg">{previewDocument.title}</h2>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta"
              >
                Close
              </button>
            </div>
            {previewDocument.type === "pdf" ? (
              <iframe src={previewDocument.href} title={previewDocument.title} className="h-[calc(92vh-65px)] w-full bg-white" />
            ) : (
              <div className="max-h-[calc(92vh-65px)] overflow-auto bg-zinc-100 p-4">
                <img src={previewDocument.href} alt={previewDocument.title} className="mx-auto h-auto w-full max-w-4xl border border-zinc-300 bg-white" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
