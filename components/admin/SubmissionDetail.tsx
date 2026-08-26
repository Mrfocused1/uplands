"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatFormDisplay } from "@/lib/admin/formDisplay";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";
import type { EvidencePrintTransform, EvidenceType } from "@/types/evidence";

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
  createdAt: string;
  updatedAt: string;
  printData: UHSF1601PrintData;
  evidence: EvidenceItem[];
}

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  cscs: "CSCS Card",
  asbestos: "Asbestos Awareness Certificate",
  manualHandling: "Manual Handling Awareness Certificate",
};

type Tab = "form" | "documents" | "review";

export function SubmissionDetail({ id }: { id: string }) {
  const [data, setData] = useState<SubmissionDetailData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("form");
  const [statusBusy, setStatusBusy] = useState(false);

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

  function downloadPdf() {
    window.open(`/api/admin/submissions/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
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
      <Link href="/admin/submissions" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Back to inductions
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{data.fullName || "Unknown inductee"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {data.reference} · {data.companyName || "No company"} · {data.siteName || "No site"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ready ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ready to print</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Not reviewed</span>
          )}
          <button
            onClick={downloadPdf}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
              tab === item.key ? "border-b-2 border-zinc-900 bg-white text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "form" && <FormTab printData={data.printData} />}
        {tab === "documents" && <DocumentsTab id={id} evidence={data.evidence} />}
        {tab === "review" && (
          <ReviewTab
            id={id}
            ready={ready}
            statusBusy={statusBusy}
            onToggleStatus={toggleStatus}
            onDownload={downloadPdf}
          />
        )}
      </div>
    </div>
  );
}

function FormTab({ printData }: { printData: UHSF1601PrintData }) {
  const sections = formatFormDisplay(printData);
  return (
    <div className="grid gap-6">
      {sections.map((section) => (
        <div key={section.title} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <h2 className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-700">
            {section.title}
          </h2>
          <dl className="divide-y divide-zinc-100">
            {section.rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-3">
                <dt className="text-sm text-zinc-500">{row.label}</dt>
                <dd className="text-sm font-medium text-zinc-900 sm:col-span-2">
                  {row.imageDataUrl ? (
                    <img src={row.imageDataUrl} alt={row.label} className="max-h-20 rounded border border-zinc-200 bg-white" />
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
    return <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">No documents were uploaded.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {evidence.map((doc) => {
        const transform = doc.printTransform;
        const fitModeLabel = transform.fitMode === "fill" ? "Fill" : transform.fitMode === "custom" ? "Custom" : "Fit";
        return (
          <div key={doc.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
                <Link
                  href={`/admin/submissions/${id}/editor?type=${doc.type}`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
                >
                  Edit print crop
                </Link>
                {doc.hasOriginal && (
                  <a
                    href={`/api/admin/submissions/${id}/original/${doc.type}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
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
  onDownload,
}: {
  id: string;
  ready: boolean;
  statusBusy: boolean;
  onToggleStatus: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-zinc-900">Print preparation</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Adjust how each uploaded document appears on page 2, then mark the induction ready to print.
      </p>

      <div className="mt-6 grid gap-3">
        <Link
          href={`/admin/submissions/${id}/editor`}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Open evidence editor
        </Link>
        <button
          onClick={onDownload}
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Download PDF
        </button>
        <button
          onClick={onToggleStatus}
          disabled={statusBusy}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            ready
              ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {ready ? "Mark as not reviewed" : "Mark ready to print"}
        </button>
      </div>
    </div>
  );
}
