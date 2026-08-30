/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Spinner } from "@/components/Spinner";

type ProcessingStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "OCR_REQUIRED";
type Answer = "Yes" | "No" | "N/A";
type DocumentType = "image" | "pdf" | "file";

export type LegacyRamsReview = {
  id: string;
  company: string;
  title: string;
  site: string;
  generalComments: string;
  sourceRef?: string;
  downloadHref: string;
  frontHref?: string;
  backHref?: string;
  pressureSystems: Answer;
  hazardsYes: string[];
  questions: [string, Answer, string][];
};

type PreviewDocument = {
  title: string;
  description: string;
  href: string;
  type: DocumentType;
};

interface RamsIntelligenceDocument {
  id: string;
  title: string;
  siteId: string | null;
  siteName: string | null;
  contractor: string;
  documentReference: string | null;
  revision: string | null;
  revisionDate: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  textExtractionStatus: string;
  createdAt: string;
  sectionCount: number;
  chunkCount: number;
}

interface EvidenceBox {
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  page_width: number | null;
  page_height: number | null;
}

interface SearchResult {
  chunkId: string;
  pageNumber: number;
  endPageNumber: number;
  sectionTitle: string | null;
  snippet: string;
  score: number;
  text: string;
  boxes: EvidenceBox[];
}

interface RamsSection {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  sortOrder: number;
}

interface CopilotAnswer {
  answer: string;
  confidence: "low" | "medium" | "high";
  model: string;
  aiConfigured: boolean;
  citations: SearchResult[];
}

interface FullReviewRecommendation {
  questionKey: string;
  recommendation: Answer;
  comment: string;
  citations: SearchResult[];
  confidence: "low" | "medium" | "high";
  status: "needs_human_confirmation";
}

const faqSearches = [
  { id: "training", label: "Training Requirements", query: "training requirements CSCS IPAF PASMA asbestos awareness first aid" },
  { id: "ppe", label: "PPE Requirements", query: "PPE personal protective equipment required" },
  { id: "asbestos", label: "Asbestos", query: "asbestos" },
  { id: "ipaf", label: "IPAF / MEWP", query: "IPAF MEWP mobile elevating work platform" },
  { id: "emergency", label: "Emergency Arrangements", query: "emergency arrangements first aid fire evacuation accident" },
  { id: "height", label: "Working At Height", query: "working at height ladder scaffold access equipment" },
];

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

function answerClass(answer: Answer) {
  if (answer === "Yes") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (answer === "No") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function reviewDocumentsFor(review: LegacyRamsReview): PreviewDocument[] {
  const documents: PreviewDocument[] = [];
  if (review.frontHref) {
    documents.push({
      title: "RAMS REVIEW FORM Front Page",
      description: "Method statement / risk assessment details and hazard checklist.",
      href: review.frontHref,
      type: "image",
    });
  }
  if (review.backHref) {
    documents.push({
      title: "RAMS REVIEW FORM Back Page",
      description: "RAMS review questions with completed comments.",
      href: review.backHref,
      type: "image",
    });
  }
  return documents;
}

type ReviewEvidenceItem = {
  id: string;
  title: string;
  answer: Answer;
  comment: string;
};

function reviewEvidenceQuery(item: ReviewEvidenceItem) {
  return [item.title, item.comment].filter(Boolean).join(" ");
}

function ReviewEvidence({
  review,
  onResolveEvidence,
  onShowEvidence,
  onRunFullReview,
  fullReviewing,
  fullReview,
  fullReviewError,
}: {
  review: LegacyRamsReview;
  onResolveEvidence: (query: string) => Promise<SearchResult[]>;
  onShowEvidence: (result: SearchResult) => void;
  onRunFullReview: () => void;
  fullReviewing: boolean;
  fullReview: { model: string; recommendations: FullReviewRecommendation[] } | null;
  fullReviewError: string;
}) {
  const [tab, setTab] = useState<"questions" | "hazards">("questions");
  const [openEvidenceId, setOpenEvidenceId] = useState<string | null>(null);
  const [evidenceResults, setEvidenceResults] = useState<Record<string, SearchResult[]>>({});
  const [evidenceLoadingId, setEvidenceLoadingId] = useState<string | null>(null);
  const [evidenceErrors, setEvidenceErrors] = useState<Record<string, string>>({});
  const items = useMemo(() => {
    if (tab === "questions") {
      return review.questions.map(([id, answer, comment]) => ({
        id,
        title: questionText[id] ?? id,
        answer,
        comment,
      }));
    }

    const yes = new Set(review.hazardsYes);
    return hazardLabels.map((label) => ({
      id: label,
      title: label,
      answer: label === "Pressure Systems" ? review.pressureSystems : yes.has(label) ? "Yes" : ("No" as Answer),
      comment: "",
    }));
  }, [review, tab]);

  async function toggleEvidence(item: ReviewEvidenceItem) {
    const evidenceId = `${tab}:${item.id}`;
    if (openEvidenceId === evidenceId) {
      setOpenEvidenceId(null);
      return;
    }

    setOpenEvidenceId(evidenceId);
    if (evidenceResults[evidenceId]) return;

    setEvidenceLoadingId(evidenceId);
    setEvidenceErrors((current) => ({ ...current, [evidenceId]: "" }));
    try {
      const results = await onResolveEvidence(reviewEvidenceQuery(item));
      setEvidenceResults((current) => ({ ...current, [evidenceId]: results }));
    } catch (caught) {
      setEvidenceErrors((current) => ({
        ...current,
        [evidenceId]: caught instanceof Error ? caught.message : "Unable to find RAMS evidence.",
      }));
    } finally {
      setEvidenceLoadingId(null);
    }
  }

  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-slab text-2xl text-uplands-charcoal">Review Answers</h2>
          <p className="mt-1 text-sm text-uplands-muted">Recorded UHSF16.01 answers for this RAMS review.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRunFullReview} disabled={fullReviewing} className="inline-flex min-h-10 items-center gap-2 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
            {fullReviewing && <Spinner className="h-4 w-4" />}
            {fullReviewing ? "Reviewing..." : "Run AI Review"}
          </button>
          <div className="flex border border-zinc-300 p-1">
            <button
              type="button"
              onClick={() => setTab("questions")}
              className={`px-4 py-2 text-sm font-bold uppercase ${tab === "questions" ? "bg-uplands-charcoal text-white" : "text-zinc-700 hover:text-uplands-magenta"}`}
            >
              Questions
            </button>
            <button
              type="button"
              onClick={() => setTab("hazards")}
              className={`px-4 py-2 text-sm font-bold uppercase ${tab === "hazards" ? "bg-uplands-charcoal text-white" : "text-zinc-700 hover:text-uplands-magenta"}`}
            >
              Hazards
            </button>
          </div>
        </div>
      </div>
      {fullReviewError && <p className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{fullReviewError}</p>}
      {fullReview && (
        <div className="mb-5 border border-zinc-200 bg-uplands-paper p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-din text-base text-uplands-charcoal">AI Review Recommendations</h3>
              <p className="text-xs font-bold uppercase text-uplands-muted">Model: {fullReview.model} · Human confirmation required</p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-zinc-200 border border-zinc-200 bg-white">
            {fullReview.recommendations.map((recommendation) => (
              <details key={recommendation.questionKey}>
                <summary className="cursor-pointer px-4 py-3">
                  <span className="font-din text-sm text-uplands-charcoal">{questionText[recommendation.questionKey] ?? recommendation.questionKey}</span>
                  <span className={`ml-3 inline-block px-2.5 py-1 text-xs font-bold ring-1 ${answerClass(recommendation.recommendation)}`}>
                    {recommendation.recommendation}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-sm leading-6 text-zinc-800">{recommendation.comment}</p>
                  <p className="text-xs font-bold uppercase text-uplands-muted">Confidence: {recommendation.confidence}</p>
                  {recommendation.citations.length > 0 ? (
                    <SearchResultsList results={recommendation.citations} onShowEvidence={onShowEvidence} />
                  ) : (
                    <p className="text-sm text-uplands-muted">No validated citation was returned for this recommendation.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
        {items.map((item) => {
          const evidenceId = `${tab}:${item.id}`;
          const evidenceOpen = openEvidenceId === evidenceId;
          const results = evidenceResults[evidenceId] ?? [];
          const evidenceError = evidenceErrors[evidenceId];
          return (
            <div key={evidenceId} data-testid={`review-evidence-${tab}-${item.id}`} className="px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="font-din text-sm text-uplands-charcoal">{item.title}</p>
                  {item.comment && <p className="mt-1 text-sm leading-6 text-zinc-700">{item.comment}</p>}
                </div>
                <span className={`w-fit px-2.5 py-1 text-xs font-bold ring-1 ${answerClass(item.answer)}`}>{item.answer}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleEvidence(item)}
                aria-expanded={evidenceOpen}
                className="mt-3 border border-zinc-300 px-3 py-2 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
              >
                {evidenceOpen ? "Hide RAMS References" : "Show RAMS References"}
              </button>
              {evidenceOpen && (
                <div className="mt-3 border border-zinc-200 bg-zinc-50">
                  {evidenceLoadingId === evidenceId ? (
                    <div className="flex items-center gap-3 p-3 text-sm font-bold text-uplands-muted">
                      <Spinner className="h-4 w-4" />
                      <span>Finding RAMS references...</span>
                    </div>
                  ) : evidenceError ? (
                    <p className="p-3 text-sm font-bold text-red-700">{evidenceError}</p>
                  ) : (
                    <SearchResultsList results={results} onShowEvidence={onShowEvidence} emptyText="No RAMS references found for this answer." />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FullReviewPanel({
  onRunFullReview,
  fullReviewing,
  fullReview,
  fullReviewError,
  onShowEvidence,
}: {
  onRunFullReview: () => void;
  fullReviewing: boolean;
  fullReview: { model: string; recommendations: FullReviewRecommendation[] } | null;
  fullReviewError: string;
  onShowEvidence: (result: SearchResult) => void;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-slab text-2xl text-uplands-charcoal">Full AI Review</h2>
          <p className="mt-1 text-sm text-uplands-muted">Generate UHSF16.01 recommendations from retrieved RAMS evidence. Human confirmation is required.</p>
        </div>
        <button type="button" onClick={onRunFullReview} disabled={fullReviewing} className="inline-flex min-h-10 items-center gap-2 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
          {fullReviewing && <Spinner className="h-4 w-4" />}
          {fullReviewing ? "Reviewing..." : "Run AI Review"}
        </button>
      </div>
      {fullReviewError && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{fullReviewError}</p>}
      {fullReview && (
        <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
          {fullReview.recommendations.map((recommendation) => (
            <details key={recommendation.questionKey}>
              <summary className="cursor-pointer px-4 py-3">
                <span className="font-din text-sm text-uplands-charcoal">{questionText[recommendation.questionKey] ?? recommendation.questionKey}</span>
                <span className={`ml-3 inline-block px-2.5 py-1 text-xs font-bold ring-1 ${answerClass(recommendation.recommendation)}`}>
                  {recommendation.recommendation}
                </span>
              </summary>
              <div className="space-y-3 border-t border-zinc-100 bg-zinc-50 p-4">
                <p className="text-sm leading-6 text-zinc-800">{recommendation.comment}</p>
                <p className="text-xs font-bold uppercase text-uplands-muted">Confidence: {recommendation.confidence} · Model: {fullReview.model}</p>
                <SearchResultsList results={recommendation.citations} onShowEvidence={onShowEvidence} emptyText="No validated citation was returned for this recommendation." />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function PreviewModal({ document, onClose }: { document: PreviewDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={document.title} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-zinc-200 bg-white shadow-soft" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3">
          <h2 className="font-din text-base text-uplands-charcoal sm:text-lg">{document.title}</h2>
          <button type="button" onClick={onClose} className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta">
            Close
          </button>
        </div>
        {document.type === "pdf" ? (
          <iframe src={document.href} title={document.title} className="h-[calc(92vh-65px)] w-full bg-white" />
        ) : (
          <div className="max-h-[calc(92vh-65px)] overflow-auto bg-zinc-100 p-4">
            <img src={document.href} alt={document.title} className="mx-auto h-auto w-full max-w-4xl border border-zinc-300 bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentInformation({
  document,
  sections,
  loadingSections,
  onShowPage,
}: {
  document: RamsIntelligenceDocument;
  sections: RamsSection[];
  loadingSections: boolean;
  onShowPage: (page: number) => void;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-soft">
      <h2 className="font-slab text-2xl text-uplands-charcoal">Document Information</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <dt className="font-bold text-zinc-700">Pages</dt>
        <dd>{document.pageCount ?? "-"}</dd>
        <dt className="font-bold text-zinc-700">Passages</dt>
        <dd>{document.chunkCount}</dd>
        <dt className="font-bold text-zinc-700">File</dt>
        <dd>{fileSize(document.fileSize)}</dd>
        <dt className="font-bold text-zinc-700">Status</dt>
        <dd>
          <span className={`px-2 py-1 text-xs font-bold uppercase ring-1 ${statusClass(document.processingStatus)}`}>{document.processingStatus.replace("_", " ")}</span>
        </dd>
      </dl>

      <details className="mt-5 border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 font-din text-sm uppercase text-uplands-charcoal">
          Sections ({document.sectionCount})
        </summary>
        <div className="max-h-96 overflow-auto border-t border-zinc-200">
          {loadingSections && (
            <div className="flex items-center gap-3 p-4 text-sm font-bold text-uplands-muted">
              <Spinner className="h-4 w-4" />
              <span>Loading sections...</span>
            </div>
          )}
          {!loadingSections &&
            sections.map((section) => {
              const startPage = Math.max(1, section.startPage);
              const endPage = Math.max(startPage, section.endPage);
              const showPage = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                onShowPage(startPage);
              };
              return (
                <details key={section.id} className="border-b border-zinc-100 last:border-b-0">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-uplands-paper">{section.title}</summary>
                  <div className="grid gap-3 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 sm:grid-cols-[1fr_auto] sm:items-center">
                    <span>
                      Page {startPage}
                      {endPage > startPage ? ` to ${endPage}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={showPage}
                      onPointerUp={(event) => {
                        if (event.pointerType !== "mouse") showPage(event);
                      }}
                      className="w-fit border border-uplands-magenta px-3 py-2 text-xs font-bold uppercase text-uplands-magenta hover:bg-uplands-magenta hover:text-white"
                    >
                      Show Page
                    </button>
                  </div>
                </details>
              );
            })}
          {!loadingSections && sections.length === 0 && <p className="p-4 text-sm text-uplands-muted">No section titles have been extracted for this RAMS.</p>}
        </div>
      </details>
    </section>
  );
}

function DocumentIntelligenceSummary({
  document,
  processing,
  asking,
  onProcess,
  onReadSummary,
  onClose,
}: {
  document: RamsIntelligenceDocument;
  processing: boolean;
  asking: boolean;
  onProcess: () => void;
  onReadSummary: () => void;
  onClose: () => void;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-slab text-2xl text-uplands-charcoal">Document Intelligence</h2>
          <p className="mt-1 font-din text-lg text-uplands-charcoal">{document.contractor}</p>
          <p className="mt-1 text-sm text-uplands-muted">
            {document.title}
            {document.siteName ? ` · ${document.siteName}` : ""}
            {document.revision ? ` · Rev ${document.revision}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/admin/rams/${document.id}/pdf?download=1`} className="inline-flex min-h-10 items-center bg-uplands-charcoal px-4 text-sm font-bold uppercase text-white">
            Download PDF
          </a>
          {document.processingStatus !== "PROCESSING" && document.processingStatus !== "READY" && (
            <button type="button" onClick={onProcess} disabled={processing} className="inline-flex min-h-10 items-center gap-2 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
              {processing && <Spinner className="h-4 w-4" />}
              {processing ? "Processing..." : "Process RAMS"}
            </button>
          )}
          <button
            type="button"
            onClick={onReadSummary}
            disabled={asking || document.processingStatus !== "READY"}
            className="inline-flex min-h-10 items-center gap-2 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 disabled:text-zinc-400"
          >
            {asking && <Spinner className="h-4 w-4" />}
            {asking ? "Reading..." : "Read Summary"}
          </button>
          <button type="button" onClick={onClose} className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700">
            Close
          </button>
        </div>
      </div>
    </section>
  );
}

function SearchResultsList({
  results,
  onShowEvidence,
  emptyText = "No search results yet.",
}: {
  results: SearchResult[];
  onShowEvidence: (result: SearchResult) => void;
  emptyText?: string;
}) {
  if (results.length === 0) return <p className="p-3 text-sm text-uplands-muted">{emptyText}</p>;

  return (
    <>
      {results.map((result) => (
        <button key={result.chunkId} type="button" onClick={() => onShowEvidence(result)} className="block w-full p-3 text-left hover:bg-uplands-paper">
          <span className="text-xs font-bold uppercase text-uplands-magenta">
            Page {result.pageNumber}
            {result.sectionTitle ? ` · ${result.sectionTitle}` : ""}
          </span>
          <span className="mt-1 block text-sm leading-5 text-zinc-800">{result.snippet}</span>
          <span className="mt-2 inline-block border border-uplands-magenta px-2 py-1 text-xs font-bold uppercase text-uplands-magenta">Show in RAMS</span>
        </button>
      ))}
    </>
  );
}

function isPdfCancellation(caught: unknown) {
  if (!(caught instanceof Error)) return false;
  return caught.name === "RenderingCancelledException" || caught.name === "AbortException" || /cancel|abort|destroy/i.test(caught.message);
}

function RamsPdfPageViewer({
  documentId,
  contractor,
  page,
  zoom,
  highlightBoxes,
  highlightPulse,
}: {
  documentId: string;
  contractor: string;
  page: number;
  zoom: number;
  highlightBoxes: EvidenceBox[];
  highlightPulse: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const loadSequenceRef = useRef(0);
  const renderSequenceRef = useRef(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadSequence;
    let cancelled = false;
    const abortController = new AbortController();
    let loadingTask: PDFDocumentLoadingTask | null = null;
    setLoading(true);
    setError("");
    setPdf(null);
    setPageSize(null);

    import("pdfjs-dist")
      .then(({ getDocument, GlobalWorkerOptions }) => {
        GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        return fetch(`/api/admin/rams/${documentId}/pdf`, { credentials: "same-origin", signal: abortController.signal }).then(async (response) => {
          if (!response.ok) throw new Error("PDF request failed.");
          const pdfBytes = await response.arrayBuffer();
          if (cancelled || loadSequenceRef.current !== loadSequence) return null;
          loadingTask = getDocument({ data: new Uint8Array(pdfBytes) });
          return loadingTask.promise;
        });
      })
      .then((loadedPdf) => {
        if (!loadedPdf) return;
        if (!cancelled && loadSequenceRef.current === loadSequence) setPdf(loadedPdf);
      })
      .catch((caught) => {
        if (!cancelled && loadSequenceRef.current === loadSequence && !isPdfCancellation(caught)) setError("Unable to load this RAMS PDF.");
      })
      .finally(() => {
        if (!cancelled && loadSequenceRef.current === loadSequence) setLoading(false);
      });

    return () => {
      cancelled = true;
      abortController.abort();
      renderTaskRef.current?.cancel();
      void loadingTask?.destroy();
    };
  }, [documentId]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderSequence = renderSequenceRef.current + 1;
    renderSequenceRef.current = renderSequence;
    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to prepare the PDF canvas.");
      return;
    }

    renderTaskRef.current?.cancel();
    setRendering(true);
    setError("");

    pdf
      .getPage(page)
      .then((pdfPage) => {
        if (cancelled || renderSequenceRef.current !== renderSequence) return null;
        const viewport = pdfPage.getViewport({ scale: zoom / 100 });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        setPageSize({ width: viewport.width, height: viewport.height });
        const renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        return renderTask.promise;
      })
      .catch((caught) => {
        if (!cancelled && renderSequenceRef.current === renderSequence && !isPdfCancellation(caught)) setError("Unable to render this PDF page.");
      })
      .finally(() => {
        if (!cancelled && renderSequenceRef.current === renderSequence) setRendering(false);
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [page, pdf, zoom]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 border border-zinc-200 bg-white text-sm font-bold text-uplands-muted">
        <Spinner className="h-4 w-4" />
        <span>Loading RAMS PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] border border-zinc-200 bg-white p-5">
        <p className="text-sm font-bold text-red-700">{error}</p>
        <a href={`/api/admin/rams/${documentId}/pdf#page=${page}`} className="mt-4 inline-flex min-h-10 items-center border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta">
          Open PDF
        </a>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-fit bg-white shadow-soft">
      {rendering && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 border border-zinc-200 bg-white/95 px-3 py-2 text-xs font-bold uppercase text-uplands-muted">
          <Spinner className="h-3.5 w-3.5" />
          Rendering
        </div>
      )}
      <canvas ref={canvasRef} aria-label={`${contractor} RAMS page ${page}`} className="block max-w-none bg-white" />
      {pageSize &&
        highlightBoxes.map((box, index) => {
          const pageWidth = box.page_width || pageSize.width;
          const pageHeight = box.page_height || pageSize.height;
          const pulse = highlightPulse ? "animate-pulse" : "";
          return (
            <span
              key={`${highlightPulse}-${box.x}-${box.y}-${index}`}
              data-testid="rams-highlight"
              className={`pointer-events-none absolute border-2 border-uplands-magenta bg-uplands-magenta/25 shadow-[0_0_0_9999px_rgba(188,0,150,0.025)] ${pulse}`}
              style={{
                left: `${(box.x / pageWidth) * 100}%`,
                top: `${(box.y / pageHeight) * 100}%`,
                width: `${(box.width / pageWidth) * 100}%`,
                height: `${(box.height / pageHeight) * 100}%`,
              }}
            />
          );
        })}
    </div>
  );
}

function statusClass(status: ProcessingStatus) {
  if (status === "READY") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "OCR_REQUIRED") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === "FAILED") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

function date(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fileSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function UploadModal({
  site,
  onClose,
  onUploaded,
}: {
  site?: { id: string; location: string } | null;
  onClose: () => void;
  onUploaded: (document: RamsIntelligenceDocument) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const apiUrl = site?.id ? `/api/admin/rams?siteId=${encodeURIComponent(site.id)}` : "/api/admin/rams";
    try {
      const response = await fetch("/api/admin/rams", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.error || "Unable to upload RAMS.");
      const refreshed = await fetch(apiUrl).then((item) => item.json());
      const document =
        ((refreshed.documents as RamsIntelligenceDocument[] | undefined)?.find((item) => item.id === data.document?.id) as RamsIntelligenceDocument | undefined) ??
        (data.document as RamsIntelligenceDocument | undefined);
      if (document) onUploaded(document);
      form.reset();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload RAMS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-2xl border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Upload RAMS</p>
            <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">New RAMS Document</h2>
          </div>
          <button type="button" onClick={onClose} className="border border-zinc-300 px-3 py-2 text-xs font-bold uppercase text-zinc-700">
            Close
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs font-bold uppercase text-zinc-700">RAMS Title</span>
            <input name="title" required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Project / Site</span>
            {site?.id && <input type="hidden" name="siteId" value={site.id} />}
            <input
              name="siteName"
              defaultValue={site?.location ?? ""}
              readOnly={Boolean(site?.id)}
              className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta read-only:bg-zinc-100"
            />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Contractor / Subcontractor</span>
            <input name="contractor" required className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Document / Reference No.</span>
            <input name="documentReference" className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Revision</span>
            <input name="revision" className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">Revision Date</span>
            <input name="revisionDate" type="date" className="mt-1 min-h-11 w-full border border-zinc-300 px-3 outline-none focus:border-uplands-magenta" />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-zinc-700">PDF File</span>
            <input
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="mt-1 block min-h-11 w-full border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {busy && (
          <div className="mt-4 flex items-center gap-3 border-l-4 border-uplands-magenta bg-uplands-paper p-3 text-sm font-bold">
            <Spinner />
            <span>Uploading RAMS... Processing will start automatically when a worker is configured, or can be started from the RAMS detail screen.</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 bg-uplands-magenta px-5 text-sm font-bold uppercase text-white disabled:opacity-60">
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? "Uploading..." : "Upload RAMS"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PdfWorkspace({
  document,
  legacyReview,
  onClose,
  onDocumentUpdated,
}: {
  document: RamsIntelligenceDocument;
  legacyReview?: LegacyRamsReview | null;
  onClose: () => void;
  onDocumentUpdated: (document: RamsIntelligenceDocument) => void;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 60 : 100));
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [faqResults, setFaqResults] = useState<Record<string, SearchResult[]>>({});
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [faqLoadingId, setFaqLoadingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [fullReview, setFullReview] = useState<{ model: string; recommendations: FullReviewRecommendation[] } | null>(null);
  const [fullReviewing, setFullReviewing] = useState(false);
  const [fullReviewError, setFullReviewError] = useState("");
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState<SearchResult | null>(null);
  const [highlightPulse, setHighlightPulse] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);
  const [sections, setSections] = useState<RamsSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const pdfPanelRef = useRef<HTMLDivElement | null>(null);

  const pageCount = document.pageCount ?? 1;
  const reviewDocuments = useMemo(() => (legacyReview ? reviewDocumentsFor(legacyReview) : []), [legacyReview]);
  const highlightBoxes = useMemo(() => highlight?.boxes.filter((box) => box.page_number === page).slice(0, 10) ?? [], [highlight, page]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSections(true);
    setSections([]);
    fetch(`/api/admin/rams/${document.id}/sections`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setSections(data.sections ?? []);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSections(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  function jumpToPage(targetPage: number, nextHighlight: SearchResult | null = null) {
    const safePage = Math.min(pageCount, Math.max(1, targetPage));
    setHighlight(nextHighlight);
    setPage(safePage);
    setHighlightPulse((value) => value + 1);
    window.setTimeout(() => {
      const smallViewport = window.matchMedia("(max-width: 767px)").matches;
      pdfPanelRef.current?.scrollIntoView({ behavior: smallViewport ? "auto" : "smooth", block: "start" });
    }, 0);
  }

  function showEvidence(result: SearchResult) {
    jumpToPage(result.pageNumber, result);
  }

  async function searchDocument(searchQuery: string) {
    const response = await fetch(`/api/admin/rams/${document.id}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search failed.");
    return (data.results ?? []) as SearchResult[];
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      setResults(await searchDocument(query));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function toggleFaqSearch(item: (typeof faqSearches)[number]) {
    if (openFaqId === item.id) {
      setOpenFaqId(null);
      return;
    }

    setOpenFaqId(item.id);
    if (faqResults[item.id]) return;

    setFaqLoadingId(item.id);
    setError("");
    try {
      const found = await searchDocument(item.query);
      setFaqResults((current) => ({ ...current, [item.id]: found }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setFaqLoadingId(null);
    }
  }

  async function askRamsQuestion(nextQuestion: string) {
    if (!nextQuestion.trim()) return;
    setAsking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/rams/${document.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to answer question.");
      setAnswer(data);
      setResults(data.citations ?? []);
      if (data.citations?.[0]) showEvidence(data.citations[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to answer question.");
    } finally {
      setAsking(false);
    }
  }

  async function askCopilot(event: FormEvent) {
    event.preventDefault();
    await askRamsQuestion(question);
  }

  function readSummary() {
    const summaryQuestion = "Give me a concise summary of this RAMS.";
    setQuestion(summaryQuestion);
    void askRamsQuestion(summaryQuestion);
  }

  async function runProcessing() {
    setProcessing(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/rams/${document.id}/process`, { method: "POST" });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.error || "Processing failed.");
      const refreshed = await fetch("/api/admin/rams").then((item) => item.json());
      const updated = refreshed.documents?.find((item: RamsIntelligenceDocument) => item.id === document.id) as RamsIntelligenceDocument | undefined;
      if (updated) onDocumentUpdated(updated);
      if (data.error) setError(data.error);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function runFullReview() {
    setFullReviewing(true);
    setFullReviewError("");
    try {
      const response = await fetch(`/api/admin/rams/${document.id}/full-review`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to run AI RAMS review.");
      setFullReview(data);
    } catch (caught) {
      setFullReviewError(caught instanceof Error ? caught.message : "Unable to run AI RAMS review.");
    } finally {
      setFullReviewing(false);
    }
  }

  return (
    <section className="space-y-5">
      {error && <p className="border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700 shadow-soft">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <div ref={pdfPanelRef} className="order-2 border border-zinc-200 bg-white p-4 shadow-soft xl:order-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-zinc-300 px-3 py-2 text-xs font-bold uppercase">
                Prev
              </button>
              <span className="text-sm font-bold text-zinc-700">
                Page {page} of {pageCount}
              </span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="border border-zinc-300 px-3 py-2 text-xs font-bold uppercase">
                Next
              </button>
            </div>
            <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="min-h-10 border border-zinc-300 bg-white px-3 text-sm font-bold">
              <option value={60}>60%</option>
              <option value={80}>80%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
            </select>
          </div>
          <div className="max-h-[78vh] overflow-auto bg-zinc-100 p-3">
            <RamsPdfPageViewer
              documentId={document.id}
              contractor={document.contractor}
              page={page}
              zoom={zoom}
              highlightBoxes={highlightBoxes}
              highlightPulse={highlightPulse}
            />
          </div>
        </div>

        <div className="order-1 space-y-5 xl:order-2">
          <DocumentInformation
            document={document}
            sections={sections}
            loadingSections={loadingSections}
            onShowPage={(targetPage) => jumpToPage(targetPage)}
          />

          <DocumentIntelligenceSummary
            document={document}
            processing={processing}
            asking={asking}
            onProcess={runProcessing}
            onReadSummary={readSummary}
            onClose={onClose}
          />

          {!legacyReview && (
            <FullReviewPanel
              onRunFullReview={runFullReview}
              fullReviewing={fullReviewing}
              fullReview={fullReview}
              fullReviewError={fullReviewError}
              onShowEvidence={showEvidence}
            />
          )}

          {legacyReview && (
            <section className="border border-zinc-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-slab text-2xl text-uplands-charcoal">Completed Review Form</h2>
                  <p className="mt-1 text-sm leading-6 text-uplands-muted">{legacyReview.generalComments}</p>
                  {legacyReview.sourceRef && <p className="mt-2 text-xs text-uplands-muted">Review reference: {legacyReview.sourceRef}</p>}
                </div>
                <a href={legacyReview.downloadHref} download className="inline-flex min-h-10 shrink-0 items-center bg-uplands-magenta px-4 text-sm font-bold uppercase text-white">
                  Download Review
                </a>
              </div>
              {reviewDocuments.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {reviewDocuments.map((reviewDocument) => (
                    <article key={reviewDocument.href} className="border border-zinc-200 p-4">
                      <h3 className="font-din text-base text-uplands-charcoal">{reviewDocument.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-uplands-muted">{reviewDocument.description}</p>
                      <button
                        type="button"
                        onClick={() => setPreviewDocument(reviewDocument)}
                        className="mt-3 min-h-10 border border-uplands-magenta px-4 text-sm font-bold uppercase text-uplands-magenta transition hover:bg-uplands-magenta hover:text-white"
                      >
                        View
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {legacyReview && (
            <ReviewEvidence
              review={legacyReview}
              onResolveEvidence={searchDocument}
              onShowEvidence={showEvidence}
              onRunFullReview={runFullReview}
              fullReviewing={fullReviewing}
              fullReview={fullReview}
              fullReviewError={fullReviewError}
            />
          )}

          <section className="border border-zinc-200 bg-white p-5 shadow-soft">
            <h2 className="font-slab text-2xl text-uplands-charcoal">Search RAMS</h2>
            <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
              {faqSearches.map((item) => {
                const isOpen = openFaqId === item.id;
                const itemResults = faqResults[item.id] ?? [];
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleFaqSearch(item)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-uplands-paper"
                      aria-expanded={isOpen}
                    >
                      <span className="font-din text-sm uppercase text-uplands-charcoal">{item.label}</span>
                      <span className="text-lg leading-none text-uplands-magenta">{isOpen ? "-" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-zinc-100 bg-zinc-50">
                        {faqLoadingId === item.id ? (
                          <div className="flex items-center gap-3 p-4 text-sm font-bold text-uplands-muted">
                            <Spinner className="h-4 w-4" />
                            <span>Searching...</span>
                          </div>
                        ) : (
                          <SearchResultsList results={itemResults} onShowEvidence={showEvidence} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <form onSubmit={runSearch} className="mt-4 flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search IPAF, PPE, asbestos..."
                className="min-h-11 min-w-0 flex-1 border border-zinc-300 px-3 text-sm outline-none focus:border-uplands-magenta"
              />
              <button type="submit" disabled={searching} className="inline-flex min-h-11 items-center gap-2 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
                {searching && <Spinner className="h-4 w-4" />}
                Search
              </button>
            </form>
            <div className="mt-4 divide-y divide-zinc-200 border border-zinc-200">
              <SearchResultsList results={results} onShowEvidence={showEvidence} />
            </div>
          </section>

          <section className="border border-zinc-200 bg-white p-5 shadow-soft">
            <h2 className="font-slab text-2xl text-uplands-charcoal">RAMS Copilot</h2>
            <form onSubmit={askCopilot} className="mt-4 space-y-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about this RAMS..."
                rows={3}
                className="w-full border border-zinc-300 p-3 text-sm outline-none focus:border-uplands-magenta"
              />
              <button type="submit" disabled={asking} className="inline-flex min-h-11 items-center gap-2 bg-uplands-magenta px-4 text-sm font-bold uppercase text-white disabled:opacity-60">
                {asking && <Spinner className="h-4 w-4" />}
                Ask RAMS
              </button>
            </form>
            {answer && (
              <div className="mt-4 border border-zinc-200 bg-uplands-paper p-4">
                <p className="text-sm leading-6 text-zinc-800">{answer.answer}</p>
                <p className="mt-3 text-xs font-bold uppercase text-zinc-500">
                  Confidence: {answer.confidence} · Model: {answer.model}
                </p>
                {answer.citations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {answer.citations.map((citation) => (
                      <button key={citation.chunkId} type="button" onClick={() => showEvidence(citation)} className="block w-full border border-zinc-300 bg-white p-3 text-left text-sm hover:border-uplands-magenta">
                        Page {citation.pageNumber}
                        {citation.sectionTitle ? ` · ${citation.sectionTitle}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </div>
      {previewDocument && <PreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}
    </section>
  );
}

export function RamsDocumentIntelligence({
  site,
  legacyReviews = [],
  onWorkspaceChange,
}: {
  site?: { id: string; location: string } | null;
  legacyReviews?: LegacyRamsReview[];
  onWorkspaceChange?: (active: boolean) => void;
}) {
  const [documents, setDocuments] = useState<RamsIntelligenceDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const apiUrl = site?.id ? `/api/admin/rams?siteId=${encodeURIComponent(site.id)}` : "/api/admin/rams";
    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setDocuments(data.documents ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load uploaded RAMS documents.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  const selectedDocument = useMemo(() => documents.find((document) => document.id === selectedId) ?? null, [documents, selectedId]);
  const selectedLegacyReview = useMemo(() => {
    if (!selectedDocument?.documentReference?.startsWith("legacy:")) return null;
    const legacyId = selectedDocument.documentReference.slice("legacy:".length);
    return legacyReviews.find((review) => review.id === legacyId) ?? null;
  }, [legacyReviews, selectedDocument]);

  useEffect(() => {
    onWorkspaceChange?.(Boolean(selectedDocument));
  }, [onWorkspaceChange, selectedDocument]);

  if (selectedDocument) {
    return (
      <PdfWorkspace
        document={selectedDocument}
        legacyReview={selectedLegacyReview}
        onClose={() => setSelectedId(null)}
        onDocumentUpdated={(document) => setDocuments((current) => current.map((item) => (item.id === document.id ? document : item)))}
      />
    );
  }

  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-slab text-2xl text-uplands-charcoal">Uploaded RAMS</h2>
          <p className="mt-1 text-sm text-uplands-muted">Upload, process, search and query RAMS documents.</p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="min-h-11 bg-uplands-magenta px-5 text-sm font-bold uppercase text-white">
          + Upload RAMS
        </button>
      </div>

      {error && <p className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-3 border border-zinc-200 p-4 text-sm font-bold">
          <Spinner />
          <span>Loading uploaded RAMS...</span>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 border border-zinc-200">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedId(document.id)}
              className="grid w-full gap-3 bg-white px-4 py-4 text-left transition hover:bg-uplands-paper sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <span>
                <span className="block font-din text-lg text-uplands-charcoal">{document.contractor}</span>
                <span className="mt-1 block text-sm text-uplands-muted">
                  {document.title}
                  {document.siteName ? ` · ${document.siteName}` : ""}
                  {document.revision ? ` · Rev ${document.revision}` : ""}
                </span>
                <span className="mt-1 block text-xs text-uplands-muted">
                  {document.pageCount ?? 0} pages · {document.sectionCount} sections · {document.chunkCount} searchable passages
                  {document.revisionDate ? ` · ${date(document.revisionDate)}` : ""}
                </span>
                {document.processingError && <span className="mt-1 block text-xs text-red-700">{document.processingError}</span>}
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`px-2.5 py-1 text-xs font-bold uppercase ring-1 ${statusClass(document.processingStatus)}`}>{document.processingStatus.replace("_", " ")}</span>
                <span className="px-2.5 py-1 text-xs font-bold uppercase text-uplands-magenta ring-1 ring-uplands-magenta">Open</span>
              </span>
            </button>
          ))}
          {documents.length === 0 && <p className="p-5 text-sm text-uplands-muted">No uploaded RAMS documents yet.</p>}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          site={site}
          onClose={() => setUploadOpen(false)}
          onUploaded={(document) => {
            setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
            setSelectedId(document.id);
          }}
        />
      )}
    </section>
  );
}
