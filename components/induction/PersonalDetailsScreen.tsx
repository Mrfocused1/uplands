"use client";

import { useEffect, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { ModalActions } from "./ModalActions";

type PersonalDetailsScreenProps = {
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

function stringValue(answer: FieldAnswer | undefined) {
  return typeof answer?.value === "string" ? answer.value : "";
}

export function PersonalDetailsScreen({
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
}: PersonalDetailsScreenProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.id] = stringValue(answers[field.id]);
    });
    return initial;
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const next: Record<string, string> = {};
    fields.forEach((field) => {
      next[field.id] = stringValue(answers[field.id]);
    });
    setValues(next);
    setError("");
  }, [answers, fields]);

  function continueDetails() {
    const missing = fields.some((field) => !values[field.id]?.trim());
    if (missing) {
      setError("Complete each field or use Skip.");
      return;
    }

    const payload: Record<string, InductionValue> = {};
    fields.forEach((field) => {
      payload[field.id] = values[field.id].trim();
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
          <span className="text-sm font-bold uppercase text-zinc-500">{sectionLabels.personal.title}</span>
        </div>

        <p className="mb-3 font-din text-sm uppercase text-uplands-magenta">{sectionLabels.personal.subtitle}</p>
        <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Personal details</h2>
        <p className="mt-5 text-lg leading-8 text-zinc-600">Enter your details below.</p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {fields.map((field, index) => (
            <div key={field.id}>
              <label htmlFor={`personal-${field.id}`} className="mb-2 block text-base font-bold text-uplands-charcoal">
                {field.label}
              </label>
              <input
                id={`personal-${field.id}`}
                autoFocus={index === 0}
                value={values[field.id] ?? ""}
                onChange={(event) => {
                  setValues((previous) => ({ ...previous, [field.id]: event.target.value }));
                  setError("");
                }}
                type={field.type === "phone" ? "tel" : "text"}
                inputMode={field.type === "phone" ? "tel" : undefined}
                placeholder={field.placeholder}
                className="min-h-14 w-full border-b-2 border-zinc-300 bg-transparent text-xl outline-none transition placeholder:text-zinc-400 focus:border-uplands-magenta sm:text-2xl"
              />
              {field.description && <p className="mt-2 text-sm leading-6 text-zinc-600">{field.description}</p>}
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-6 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
            {error}
          </p>
        )}

        {!onCancel && <ProgressBar progress={progress} current={current} total={total} />}
      </div>
      {onCancel ? (
        <ModalActions onCancel={onCancel} onSave={continueDetails} />
      ) : (
        <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueDetails} />
      )}
    </div>
  );
}
