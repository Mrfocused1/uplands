"use client";

import { useEffect, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { ModalActions } from "./ModalActions";
import { EvidenceUpload } from "@/components/evidence-upload/EvidenceUpload";
import { evidenceTypeFromFieldId } from "@/config/cameraGuides";

type ChecklistScreenProps = {
  fields: InductionField[];
  answers: Record<string, FieldAnswer>;
  current: number;
  total: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: (values: Record<string, InductionValue>) => void;
  onCancel?: () => void;
};

type YesNo = "Yes" | "No";

type InlineUploadConfig = {
  uploadId: string;
  label: string;
  description: string;
};

const inlineUploadsByField: Record<string, InlineUploadConfig> = {
  asbestosAwarenessCertificate: {
    uploadId: "asbestosAwarenessUpload",
    label: "Upload your Asbestos Awareness certificate",
    description: "Take or upload a clear photo of your valid Asbestos Awareness certificate.",
  },
  trainedFirstAider: {
    uploadId: "firstAiderUpload",
    label: "Upload your First Aid certificate",
    description: "Take or upload a clear photo of your First Aid certificate.",
  },
  smstsSssts: {
    uploadId: "smstsSsstsUpload",
    label: "Upload your SMSTS or SSSTS certificate",
    description: "Take or upload a clear photo of your current SMSTS or SSSTS certificate.",
  },
  ipaf: {
    uploadId: "ipafUpload",
    label: "Upload your IPAF certificate",
    description: "Take or upload a clear photo of your IPAF certificate.",
  },
  pasma: {
    uploadId: "pasmaUpload",
    label: "Upload your PASMA certificate",
    description: "Take or upload a clear photo of your PASMA certificate.",
  },
};

function valueFor(answer: FieldAnswer | undefined): YesNo | null {
  return answer?.value === "Yes" || answer?.value === "No" ? answer.value : null;
}

function uploadValueFor(answer: FieldAnswer | undefined) {
  return typeof answer?.value === "string" && answer.value.startsWith("data:image/") ? answer.value : null;
}

export function ChecklistScreen({
  fields,
  answers,
  current,
  total,
  progress,
  canGoBack,
  onBack,
  onSkip,
  onContinue,
  onCancel,
}: ChecklistScreenProps) {
  const [values, setValues] = useState<Record<string, YesNo | null>>(() => {
    const initial: Record<string, YesNo | null> = {};
    fields.forEach((field) => {
      initial[field.id] = valueFor(answers[field.id]);
    });
    return initial;
  });
  const [uploadValues, setUploadValues] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    Object.values(inlineUploadsByField).forEach((config) => {
      initial[config.uploadId] = uploadValueFor(answers[config.uploadId]);
    });
    return initial;
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(() => {
      const next: Record<string, YesNo | null> = {};
      fields.forEach((field) => {
        next[field.id] = valueFor(answers[field.id]);
      });
      return next;
    });
    setUploadValues(() => {
      const next: Record<string, string | null> = {};
      Object.values(inlineUploadsByField).forEach((config) => {
        next[config.uploadId] = uploadValueFor(answers[config.uploadId]);
      });
      return next;
    });
    setError("");
  }, [answers, fields]);

  const section = sectionLabels.competence;

  function choose(fieldId: string, option: YesNo) {
    setValues((prev) => ({ ...prev, [fieldId]: option }));
    const upload = inlineUploadsByField[fieldId];
    if (option === "No" && upload) {
      setUploadValues((prev) => ({ ...prev, [upload.uploadId]: null }));
    }
    setError("");
  }

  function continueChecklist() {
    const unanswered = fields.filter((field) => values[field.id] !== "Yes" && values[field.id] !== "No");
    if (unanswered.length > 0) {
      setError("Answer every question or use Skip.");
      return;
    }

    const payload: Record<string, InductionValue> = {};
    fields.forEach((field) => {
      const value = values[field.id];
      if (value === "Yes" || value === "No") payload[field.id] = value;
      const upload = inlineUploadsByField[field.id];
      if (upload) {
        payload[upload.uploadId] = value === "Yes" ? uploadValues[upload.uploadId] ?? null : null;
      }
    });
    onContinue(payload);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="min-h-[calc(100vh-6rem)] px-5 pb-0 pt-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="bg-uplands-magenta px-3 py-1 font-din text-xs uppercase text-white">Inductee</span>
          <span className="text-sm font-bold uppercase text-zinc-500">{section.title}</span>
        </div>

        <p className="mb-3 font-din text-sm uppercase text-uplands-magenta">{section.subtitle}</p>
        <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Tick all that apply</h2>
        <p className="mt-5 text-lg leading-8 text-zinc-600">Answer Yes or No to each of the following.</p>

        <div className="mt-9 divide-y divide-zinc-200 border border-zinc-200 bg-white shadow-soft">
          {fields.map((field) => {
            const inlineUpload = inlineUploadsByField[field.id];
            const uploadOpen = inlineUpload && values[field.id] === "Yes";

            return (
              <div key={field.id} className="p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                  <div>
                    <p className="text-lg font-bold leading-7 text-uplands-charcoal">{field.label}</p>
                    {field.note && <p className="mt-1 text-sm text-zinc-600">{field.note}</p>}
                  </div>

                  <div className="grid max-w-xs grid-cols-2 gap-3 lg:ml-auto lg:w-full">
                    {(["Yes", "No"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => choose(field.id, option)}
                        className={`min-h-12 border px-4 py-3 text-base font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                          values[field.id] === option
                            ? "border-uplands-magenta bg-uplands-magenta text-white"
                            : "border-zinc-300 bg-white text-uplands-charcoal"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {uploadOpen && (
                  <div className="mt-5 border border-zinc-200 bg-uplands-paper p-4">
                    <div className="mb-4">
                      <p className="text-sm font-bold uppercase text-uplands-charcoal">{inlineUpload.label}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">{inlineUpload.description}</p>
                    </div>
                    <EvidenceUpload
                      value={uploadValues[inlineUpload.uploadId] ?? null}
                      onChange={(next) => setUploadValues((prev) => ({ ...prev, [inlineUpload.uploadId]: next }))}
                      label={inlineUpload.label}
                      docType={evidenceTypeFromFieldId(inlineUpload.uploadId)}
                    />
                  </div>
                )}

                {field.id === "ramsBriefing" && values[field.id] === "No" && (
                  <p className="mt-4 border-l-4 border-uplands-magenta bg-white p-4 text-sm font-bold text-uplands-charcoal">
                    {field.warning}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-6 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
            {error}
          </p>
        )}

        {!onCancel && <ProgressBar progress={progress} current={current} total={total} />}
      </div>
      {onCancel ? (
        <ModalActions onCancel={onCancel} onSave={continueChecklist} />
      ) : (
        <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueChecklist} />
      )}
    </div>
  );
}
