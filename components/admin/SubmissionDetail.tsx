"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatFormDisplay } from "@/lib/admin/formDisplay";
import { downloadPdf, viewPdf } from "@/lib/admin/pdfActions";
import { Spinner } from "@/components/Spinner";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";
import { EVIDENCE_TYPES, type EvidencePrintTransform, type EvidenceType } from "@/types/evidence";

interface EvidenceItem {
  id: string;
  type: EvidenceType;
  originalName: string | null;
  mimeType: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  hasOriginal: boolean;
  printTransform: EvidencePrintTransform;
}

interface SubmissionDetailData {
  id: string;
  reference: string | null;
  fullName: string | null;
  companyName: string | null;
  siteName: string | null;
  declarationDate: string | null;
  printReviewStatus: string;
  pinned: boolean;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
  printData: UHSF1601PrintData;
  evidence: EvidenceItem[];
}

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  cscs: "CSCS Card",
  asbestos: "Asbestos Awareness Certificate",
  manualHandling: "Manual Handling Awareness Certificate",
  firstAid: "First Aid Certificate",
  smstsSssts: "SMSTS / SSSTS Certificate",
  ipaf: "IPAF Certificate",
  pasma: "PASMA Certificate",
};

type Tab = "form" | "documents" | "review";

export function SubmissionDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<SubmissionDetailData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("form");
  const [statusBusy, setStatusBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<"view" | "download" | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/submissions/${id}`);
      if (!response.ok) {
        setError("Unable to load this submission.");
        return;
      }
      const body = await response.json();
      setData(body.submission);
    } catch {
      setError("Unable to load this submission.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!data) return;
    setStatusBusy(true);
    const next = data.printReviewStatus === "ready" ? "not_reviewed" : "ready";
    await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printReviewStatus: next }),
    });
    await load();
    setStatusBusy(false);
  }

  async function togglePinned() {
    if (!data) return;
    setActionBusy(true);
    const response = await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !data.pinned }),
    });
    if (response.ok) {
      setData({ ...data, pinned: !data.pinned });
    } else {
      setError("Unable to update pin status.");
    }
    setActionBusy(false);
  }

  async function deleteCurrent() {
    if (!data || !window.confirm(`Delete ${data.fullName || data.reference || "this induction"}?`)) return;
    setActionBusy(true);
    const response = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/admin/submissions");
    } else {
      setError("Unable to delete this submission.");
      setActionBusy(false);
    }
  }

  async function handlePdf(mode: "view" | "download") {
    setPdfBusy(mode);
    setError("");

    const url = `/api/admin/submissions/${id}/pdf${mode === "download" ? "?download=1" : ""}`;
    try {
      if (mode === "view") {
        await viewPdf(url);
      } else {
        await downloadPdf(url, `UHSF16.01_${(data?.fullName || "Inductee").replace(/\s+/g, "_")}.pdf`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to prepare the PDF.");
    } finally {
      setPdfBusy(null);
    }
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-soft">{error}</div>
    );
  }

  if (!data) {
    return <div className="py-16 text-center text-zinc-500">Loading submission…</div>;
  }

  const ready = data.printReviewStatus === "ready";
  const tabs: { key: Tab; label: string }[] = [
    { key: "form", label: "Form" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review & Print" },
  ];

  return (
    <div>
      <Link href="/admin/submissions" className="text-sm font-bold uppercase tracking-wide text-zinc-600 hover:text-uplands-magenta">
        Back to inductions
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-5 border-b border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Submission record</p>
          <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">
            {data.fullName || "Unknown inductee"}
          </h1>
          <p className="mt-2 text-sm text-uplands-muted">
            {data.reference} · {data.companyName || "No company"} · {data.siteName || "No site"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.isSample && <span className="bg-zinc-100 px-2.5 py-1 text-xs font-bold uppercase text-zinc-700">Sample</span>}
            {data.pinned && <span className="bg-uplands-magenta px-2.5 py-1 text-xs font-bold uppercase text-white">Pinned</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ready ? (
            <span className="bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">Ready to print</span>
          ) : (
            <span className="bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-700">Not reviewed</span>
          )}
          <button
            onClick={togglePinned}
            disabled={actionBusy}
            className="border border-zinc-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-60"
          >
            {data.pinned ? "Unpin" : "Pin"}
          </button>
          <Link
            href={`/admin/submissions/${id}/form`}
            className="border border-zinc-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
          >
            Edit form
          </Link>
          <Link
            href={`/admin/submissions/${id}/editor`}
            className="border border-zinc-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
          >
            Edit documents
          </Link>
          <button
            onClick={() => handlePdf("view")}
            disabled={pdfBusy !== null}
            className="inline-flex items-center gap-2 bg-uplands-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#8e0075] disabled:opacity-60"
          >
            {pdfBusy === "view" && <Spinner />}
            {pdfBusy === "view" ? "Opening..." : "View PDF"}
          </button>
          <button
            onClick={() => handlePdf("download")}
            disabled={pdfBusy !== null}
            className="inline-flex items-center gap-2 bg-uplands-charcoal px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {pdfBusy === "download" && <Spinner />}
            {pdfBusy === "download" ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={deleteCurrent}
            disabled={actionBusy}
            className="border border-red-200 px-4 py-2 text-sm font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {pdfBusy && (
        <div className="mt-5 flex items-center gap-3 border-l-4 border-uplands-magenta bg-white p-4 text-sm font-bold text-uplands-charcoal shadow-soft" role="status">
          <Spinner />
          <span>{pdfBusy === "view" ? "Preparing PDF viewer..." : "Preparing PDF download..."}</span>
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
              tab === item.key ? "border-b-2 border-uplands-magenta bg-white text-uplands-charcoal" : "text-zinc-500 hover:text-uplands-magenta"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "form" && <FormTab id={id} printData={data.printData} />}
        {tab === "documents" && <DocumentsTab id={id} evidence={data.evidence} />}
        {tab === "review" && (
          <ReviewTab
            id={id}
            ready={ready}
            statusBusy={statusBusy}
            onToggleStatus={toggleStatus}
            onView={() => handlePdf("view")}
            onDownload={() => handlePdf("download")}
            pdfBusy={pdfBusy}
          />
        )}
      </div>
    </div>
  );
}

function FormTab({ id, printData }: { id: string; printData: UHSF1601PrintData }) {
  const sections = formatFormDisplay(printData);
  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Link
          href={`/admin/submissions/${id}/form`}
          className="bg-uplands-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#8e0075]"
        >
          Edit form
        </Link>
      </div>
      {sections.map((section) => (
        <div key={section.title} className="overflow-hidden border border-zinc-200 bg-white shadow-soft">
          <h2 className="border-b border-zinc-100 bg-uplands-charcoal px-5 py-3 text-sm font-bold uppercase tracking-wide text-white">
            {section.title}
          </h2>
          <dl className="divide-y divide-zinc-100">
            {section.rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-3">
                <dt className="text-sm text-zinc-500">{row.label}</dt>
                <dd className="text-sm font-medium text-zinc-900 sm:col-span-2">
                  {row.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageDataUrl} alt={row.label} className="max-h-20 border border-zinc-200 bg-white" />
                  ) : (
                    row.text
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ id, evidence }: { id: string; evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return <p className="border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-soft">No documents were uploaded.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {evidence.map((doc) => {
        const transform = doc.printTransform;
        const canEditCrop = (EVIDENCE_TYPES as readonly string[]).includes(doc.type);
        const fitModeLabel = transform.fitMode === "fill" ? "Fill" : transform.fitMode === "custom" ? "Custom" : "Fit";
        return (
          <div key={doc.id} className="overflow-hidden border border-zinc-200 bg-white shadow-soft">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-zinc-100">
              {doc.hasOriginal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/admin/submissions/${id}/preview/${doc.type}`}
                  alt={EVIDENCE_LABELS[doc.type]}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-sm text-zinc-400">No upload</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-zinc-900">{EVIDENCE_LABELS[doc.type]}</h3>
              <p className="mt-1 truncate text-xs text-zinc-500">{doc.originalName || doc.mimeType || "—"}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {fitModeLabel} · {transform.rotation}° · ×{transform.scale.toFixed(2)}
              </p>
              <div className="mt-3 flex gap-2">
                {canEditCrop && (
                  <Link
                    href={`/admin/submissions/${id}/editor?type=${doc.type}`}
                    className="bg-uplands-magenta px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-[#8e0075]"
                  >
                    Edit print crop
                  </Link>
                )}
                {doc.hasOriginal && (
                  <a
                    href={`/api/admin/submissions/${id}/original/${doc.type}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
                  >
                    Original
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewTab({
  id,
  ready,
  statusBusy,
  onToggleStatus,
  onView,
  onDownload,
  pdfBusy,
}: {
  id: string;
  ready: boolean;
  statusBusy: boolean;
  onToggleStatus: () => void;
  onView: () => void;
  onDownload: () => void;
  pdfBusy: "view" | "download" | null;
}) {
  return (
    <div className="max-w-2xl border border-zinc-200 bg-white p-6 shadow-soft">
      <h2 className="font-slab text-2xl text-uplands-charcoal">Print preparation</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Adjust how each uploaded document appears on page 2, then mark the induction ready to print.
      </p>

      <div className="mt-6 grid gap-3">
        <Link
          href={`/admin/submissions/${id}/editor`}
          className="bg-uplands-magenta px-4 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-[#8e0075]"
        >
          Open evidence editor
        </Link>
        <button
          onClick={onView}
          disabled={pdfBusy !== null}
          className="inline-flex items-center justify-center gap-2 border border-zinc-300 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-60"
        >
          {pdfBusy === "view" && <Spinner />}
          {pdfBusy === "view" ? "Opening PDF..." : "View PDF"}
        </button>
        <button
          onClick={onDownload}
          disabled={pdfBusy !== null}
          className="inline-flex items-center justify-center gap-2 border border-zinc-300 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-60"
        >
          {pdfBusy === "download" && <Spinner />}
          {pdfBusy === "download" ? "Preparing PDF..." : "Download PDF"}
        </button>
        <button
          onClick={onToggleStatus}
          disabled={statusBusy}
          className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide disabled:opacity-60 ${
            ready
              ? "border border-zinc-300 text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {ready ? "Mark as not reviewed" : "Mark ready to print"}
        </button>
      </div>
    </div>
  );
}
