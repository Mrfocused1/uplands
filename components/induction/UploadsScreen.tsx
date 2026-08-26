"use client";

import { useEffect, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { DocumentUpload } from "./DocumentUpload";

type UploadsScreenProps = {
  fields: InductionField[];
  answers: Record<string, FieldAnswer>;
  current: number;
  total: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: (values: Record<string, InductionValue>) => void;
};

function stringValue(answer: FieldAnswer | undefined) {
  return typeof answer?.value === "string" ? answer.value : "";
}

export function UploadsScreen({
  fields,
  answers,
  current,
  total,
  progress,
  canGoBack,
  onBack,
  onSkip,
  onContinue,
}: UploadsScreenProps) {
  const [values, setValues] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    fields.forEach((field) => {
      initial[field.id] = stringValue(answers[field.id]) || null;
    });
    return initial;
  });

  useEffect(() => {
    setValues(() => {
      const next: Record<string, string | null> = {};
      fields.forEach((field) => {
        next[field.id] = stringValue(answers[field.id]) || null;
      });
      return next;
    });
  }, [answers, fields]);

  const section = sectionLabels.competence;

  function continueUploads() {
    const payload: Record<string, InductionValue> = {};
    fields.forEach((field) => {
      payload[field.id] = values[field.id];
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
        <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Upload your documents</h2>
        <p className="mt-5 text-lg leading-8 text-zinc-600">
          Take or upload a photo of each document. Any that you do not have can be left blank.
        </p>

        <div className="mt-9 space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
              <p className="mb-4 text-base font-bold text-uplands-charcoal">{field.label}</p>
              {field.description && <p className="mb-4 text-sm leading-6 text-zinc-600">{field.description}</p>}
              <DocumentUpload
                value={values[field.id]}
                onChange={(next) => setValues((prev) => ({ ...prev, [field.id]: next }))}
                label={field.label}
              />
            </div>
          ))}
        </div>

        <ProgressBar progress={progress} current={current} total={total} />
      </div>
      <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueUploads} />
    </div>
  );
}
