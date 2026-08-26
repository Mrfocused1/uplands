"use client";

import { useState } from "react";
import { InductionHeader } from "./InductionHeader";
import { QuestionScreen } from "./QuestionScreen";
import { ReviewScreen } from "./ReviewScreen";
import { CompletionScreen } from "./CompletionScreen";
import { useInduction } from "@/hooks/useInduction";
import { documentMetadata, sectionLabels } from "@/config/uhsf1601Schema";
import { printDataFromRecord } from "@/lib/pdf/printDataFromRecord";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

function pdfFilename(data: UHSF1601PrintData) {
  const safeName =
    data.fullName
      ?.trim()
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_") || "Inductee";

  return `UHSF16.01_${safeName}.pdf`;
}

async function createPdfBlob(data: UHSF1601PrintData) {
  const response = await fetch("/api/induction/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || "Unable to generate UHSF16.01 PDF");
  }

  return response.blob();
}

function openPdfUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ProgressiveInduction() {
  const induction = useInduction();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  async function runPdfAction(action: (blob: Blob, data: UHSF1601PrintData) => void | Promise<void>) {
    setPdfBusy(true);
    setPdfError("");

    try {
      const data = printDataFromRecord(induction.record);
      const blob = await createPdfBlob(data);
      await action(blob, data);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Unable to generate UHSF16.01 PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  function viewCompletedForm() {
    void runPdfAction((blob) => {
      openPdfUrl(blob);
    });
  }

  function downloadPdf() {
    void runPdfAction((blob, data) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFilename(data);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  function printPdf() {
    void runPdfAction((blob) => {
      openPdfUrl(blob);
    });
  }

  if (!induction.hasLoaded || !induction.currentField) {
    return (
      <div className="min-h-screen bg-uplands-paper">
        <InductionHeader />
        <main className="px-5 py-16 text-center font-bold text-zinc-600">Loading saved induction...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-uplands-paper">
      <InductionHeader />

      <main>
        {induction.screen === "wizard" && (
          <QuestionScreen
            field={induction.currentField}
            answer={induction.currentAnswer}
            defaultValue={induction.defaultValue}
            current={induction.currentIndex + 1}
            total={induction.visibleFields.length}
            progress={induction.progress}
            canGoBack={induction.canGoBack}
            onBack={induction.goBack}
            onSkip={induction.skipCurrent}
            onContinue={induction.continueWithValue}
            onInformationContinue={induction.continueInfo}
          />
        )}

        {induction.screen === "review" && (
          <ReviewScreen
            record={induction.record}
            fields={induction.fields}
            onBack={induction.goBack}
            onSkip={induction.submit}
            onSubmit={induction.submit}
            onEdit={induction.editField}
          />
        )}

        {induction.screen === "completion" && (
          <CompletionScreen
            record={induction.record}
            fields={induction.fields}
            onViewCompletedForm={viewCompletedForm}
            onDownloadPdf={downloadPdf}
            onPrintPdf={printPdf}
            onStartAnother={induction.startAnother}
            pdfBusy={pdfBusy}
            pdfError={pdfError}
          />
        )}
      </main>

      <footer className="no-print px-5 py-8 text-center text-xs text-zinc-500">
        <p>
          {documentMetadata.code} · Issued {documentMetadata.issued} · Document Type {documentMetadata.documentType} ·
          Created by {documentMetadata.documentCreatedBy} · {documentMetadata.status} · Page {documentMetadata.page}
        </p>
        <p className="mt-2">
          {sectionLabels.personal.title}, {sectionLabels.competence.title}, {sectionLabels.declaration.title}, and{" "}
          {sectionLabels.acknowledgement.title}
        </p>
      </footer>
    </div>
  );
}
