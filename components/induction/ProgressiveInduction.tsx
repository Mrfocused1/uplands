"use client";

import { useState } from "react";
import { InductionHeader } from "./InductionHeader";
import { QuestionScreen } from "./QuestionScreen";
import { PersonalDetailsScreen } from "./PersonalDetailsScreen";
import { ChecklistScreen } from "./ChecklistScreen";
import { DeclarationScreen } from "./DeclarationScreen";
import { UploadsScreen } from "./UploadsScreen";
import { ReviewScreen } from "./ReviewScreen";
import { CompletionScreen } from "./CompletionScreen";
import { useInduction } from "@/hooks/useInduction";
import { documentMetadata, sectionLabels } from "@/config/uhsf1601Schema";
import { printDataFromRecord } from "@/lib/pdf/printDataFromRecord";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

type PdfAction = "view" | "download" | "print";

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
  const [pdfAction, setPdfAction] = useState<PdfAction | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function runPdfAction(
    actionName: PdfAction,
    action: (blob: Blob, data: UHSF1601PrintData) => void | Promise<void>,
  ) {
    setPdfBusy(true);
    setPdfAction(actionName);
    setPdfError("");

    try {
      const data = printDataFromRecord(induction.record);
      const blob = await createPdfBlob(data);
      await action(blob, data);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Unable to generate UHSF16.01 PDF");
    } finally {
      setPdfBusy(false);
      setPdfAction(null);
    }
  }

  function viewCompletedForm() {
    void runPdfAction("view", (blob) => {
      openPdfUrl(blob);
    });
  }

  function downloadPdf() {
    void runPdfAction("download", (blob, data) => {
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
    void runPdfAction("print", (blob) => {
      openPdfUrl(blob);
    });
  }

  async function submitInduction() {
    if (submitBusy) return;

    setSubmitBusy(true);
    setSubmitError("");

    const data = printDataFromRecord(induction.record);

    try {
      const response = await fetch("/api/induction/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json().catch(() => null)) as { reference?: string; error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save the induction to Admin.");
      }

      induction.submit(result?.reference);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the induction to Admin.");
    } finally {
      setSubmitBusy(false);
    }
  }

  if (!induction.hasLoaded || !induction.currentStep) {
    return (
      <div className="min-h-screen bg-uplands-paper">
        <InductionHeader />
        <main className="px-5 py-16 text-center font-bold text-zinc-600">Loading saved induction...</main>
      </div>
    );
  }

  const currentStep = induction.currentStep;
  const editStep = induction.editStep;

  return (
    <div className="min-h-screen bg-uplands-paper">
      <InductionHeader />

      <main>
        {induction.screen === "wizard" && currentStep.kind === "group" && currentStep.groupId === "personal-details" && (
          <PersonalDetailsScreen
            key={currentStep.groupId}
            fields={currentStep.fields}
            answers={induction.record.answers}
            current={induction.currentIndex + 1}
            total={induction.total}
            progress={induction.progress}
            canGoBack={induction.canGoBack}
            onBack={induction.goBack}
            onSkip={induction.skipCurrent}
            onContinue={induction.continueGroup}
          />
        )}

        {induction.screen === "wizard" && currentStep.kind === "group" && currentStep.groupId === "competence-checklist" && (
          <ChecklistScreen
            key={currentStep.groupId}
            fields={currentStep.fields}
            answers={induction.record.answers}
            current={induction.currentIndex + 1}
            total={induction.total}
            progress={induction.progress}
            canGoBack={induction.canGoBack}
            onBack={induction.goBack}
            onSkip={induction.skipCurrent}
            onContinue={induction.continueGroup}
          />
        )}

        {induction.screen === "wizard" && currentStep.kind === "group" && currentStep.groupId === "declaration-group" && (
          <DeclarationScreen
            key={currentStep.groupId}
            fields={currentStep.fields}
            answers={induction.record.answers}
            current={induction.currentIndex + 1}
            total={induction.total}
            progress={induction.progress}
            canGoBack={induction.canGoBack}
            onBack={induction.goBack}
            onSkip={induction.skipCurrent}
            onContinue={induction.continueGroup}
          />
        )}

        {induction.screen === "wizard" && currentStep.kind === "group" && currentStep.groupId === "document-uploads" && (
          <UploadsScreen
            key={currentStep.groupId}
            fields={currentStep.fields}
            answers={induction.record.answers}
            current={induction.currentIndex + 1}
            total={induction.total}
            progress={induction.progress}
            canGoBack={induction.canGoBack}
            onBack={induction.goBack}
            onSkip={induction.skipCurrent}
            onContinue={induction.continueGroup}
          />
        )}

        {induction.screen === "wizard" && currentStep.kind === "field" && (
          <QuestionScreen
            field={currentStep.field}
            answer={induction.currentAnswer}
            defaultValue={induction.defaultValue}
            current={induction.currentIndex + 1}
            total={induction.total}
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
            onSkip={submitInduction}
            onSubmit={submitInduction}
            onEdit={induction.openEdit}
            submitBusy={submitBusy}
            submitError={submitError}
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
            pdfAction={pdfAction}
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
          {sectionLabels.personal.title}, {sectionLabels.competence.title}, and {sectionLabels.declaration.title}
        </p>
      </footer>

      {editStep && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="mx-auto my-4 max-w-3xl bg-uplands-paper shadow-2xl sm:my-8">
            {editStep.kind === "field" && (
              <QuestionScreen
                field={editStep.field}
                answer={induction.record.answers[editStep.field.id]}
                defaultValue={null}
                current={1}
                total={1}
                progress={100}
                canGoBack={false}
                onBack={induction.closeEdit}
                onSkip={induction.closeEdit}
                onContinue={induction.saveFieldEdit}
                onInformationContinue={induction.closeEdit}
                onCancel={induction.closeEdit}
              />
            )}

            {editStep.kind === "group" && editStep.groupId === "personal-details" && (
              <PersonalDetailsScreen
                key={editStep.groupId}
                fields={editStep.fields}
                answers={induction.record.answers}
                current={1}
                total={1}
                progress={100}
                canGoBack={false}
                onBack={induction.closeEdit}
                onSkip={induction.closeEdit}
                onContinue={induction.saveEdit}
                onCancel={induction.closeEdit}
              />
            )}

            {editStep.kind === "group" && editStep.groupId === "competence-checklist" && (
              <ChecklistScreen
                key={editStep.groupId}
                fields={editStep.fields}
                answers={induction.record.answers}
                current={1}
                total={1}
                progress={100}
                canGoBack={false}
                onBack={induction.closeEdit}
                onSkip={induction.closeEdit}
                onContinue={induction.saveEdit}
                onCancel={induction.closeEdit}
              />
            )}

            {editStep.kind === "group" && editStep.groupId === "declaration-group" && (
              <DeclarationScreen
                key={editStep.groupId}
                fields={editStep.fields}
                answers={induction.record.answers}
                current={1}
                total={1}
                progress={100}
                canGoBack={false}
                onBack={induction.closeEdit}
                onSkip={induction.closeEdit}
                onContinue={induction.saveEdit}
                onCancel={induction.closeEdit}
              />
            )}

            {editStep.kind === "group" && editStep.groupId === "document-uploads" && (
              <UploadsScreen
                key={editStep.groupId}
                fields={editStep.fields}
                answers={induction.record.answers}
                current={1}
                total={1}
                progress={100}
                canGoBack={false}
                onBack={induction.closeEdit}
                onSkip={induction.closeEdit}
                onContinue={induction.saveEdit}
                onCancel={induction.closeEdit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
