"use client";

import { calculateCompletionStatus, displayAnswer } from "@/hooks/useInduction";
import type { InductionField, InductionRecord } from "@/types/induction";

type CompletionScreenProps = {
  record: InductionRecord;
  fields: InductionField[];
  onViewCompletedForm: () => void;
  onDownloadPdf: () => void;
  onPrintPdf: () => void;
  onStartAnother: () => void;
  pdfBusy?: boolean;
  pdfError?: string;
};

function findAnswer(fields: InductionField[], record: InductionRecord, id: string) {
  const field = fields.find((item) => item.id === id);
  return field ? displayAnswer(field, record.answers[id]) : "Not provided";
}

export function CompletionScreen({
  record,
  fields,
  onViewCompletedForm,
  onDownloadPdf,
  onPrintPdf,
  onStartAnother,
  pdfBusy,
  pdfError,
}: CompletionScreenProps) {
  const status = record.status ?? calculateCompletionStatus(record.answers);
  const rows = [
    ["Name", findAnswer(fields, record, "fullName")],
    ["Company", findAnswer(fields, record, "companyName")],
    ["Site", findAnswer(fields, record, "siteName")],
    ["Date", findAnswer(fields, record, "declarationDate")],
    ["Reference", record.reference ?? "Not submitted"],
    ["Status", status],
  ];

  return (
    <div className="min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="font-din text-sm uppercase text-uplands-magenta">Saved</p>
        <h2 className="mt-3 font-slab text-5xl font-light leading-tight text-uplands-charcoal">Site Induction Complete</h2>
        <div className="mt-9 bg-white p-6 shadow-soft sm:p-8">
          <dl className="divide-y divide-zinc-200">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-4">
                <dt className="font-bold text-zinc-500">{label}</dt>
                <dd className="font-bold text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="mx-auto aspect-[210/297] w-40 border border-zinc-300 bg-zinc-50 p-3 shadow-sm">
            <div className="h-full border border-zinc-300 bg-white">
              <div className="h-5 border-b border-zinc-300" />
              <div className="m-3 h-16 border border-zinc-200" />
              <div className="mx-3 mt-3 h-24 border border-zinc-200" />
              <div className="mx-3 mt-3 h-12 bg-zinc-900" />
            </div>
          </div>
          <p className="mt-4 text-center text-sm leading-6 text-zinc-600">
            The completed form is generated as a real A4 PDF using the immutable UHSF16.01 PNG background with answers
            overlaid onto the original blank fields.
          </p>
        </div>

        {pdfError && (
          <p className="mt-5 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
            {pdfError}
          </p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onViewCompletedForm}
            disabled={pdfBusy}
            className="min-h-12 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal disabled:cursor-not-allowed disabled:opacity-60"
          >
            View completed form
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfBusy}
            className="min-h-12 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            disabled={pdfBusy}
            className="min-h-12 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal disabled:cursor-not-allowed disabled:opacity-60"
          >
            Print
          </button>
          <button type="button" onClick={onStartAnother} className="min-h-12 bg-uplands-magenta px-4 font-bold text-white">
            Start another induction
          </button>
        </div>
      </div>
    </div>
  );
}
