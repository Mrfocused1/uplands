"use client";

import { useEffect, useMemo, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { ModalActions } from "./ModalActions";
import { SignaturePad } from "./SignaturePad";

type DeclarationScreenProps = {
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stringValue(answer: FieldAnswer | undefined) {
  return typeof answer?.value === "string" ? answer.value : "";
}

export function DeclarationScreen({
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
}: DeclarationScreenProps) {
  const declarationFields = useMemo(() => fields.filter((field) => field.type === "declaration"), [fields]);
  const signatureField = useMemo(() => fields.find((field) => field.type === "signature"), [fields]);
  const dateField = useMemo(() => fields.find((field) => field.type === "date"), [fields]);

  const [confirmed, setConfirmed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    declarationFields.forEach((field) => {
      initial[field.id] = answers[field.id]?.value === true;
    });
    return initial;
  });
  const [signatureValue, setSignatureValue] = useState<string | null>(() => {
    if (!signatureField) return null;
    return stringValue(answers[signatureField.id]) || null;
  });
  const [dateValue, setDateValue] = useState<string>(() => {
    if (!dateField) return today();
    return stringValue(answers[dateField.id]) || today();
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setConfirmed(() => {
      const next: Record<string, boolean> = {};
      declarationFields.forEach((field) => {
        next[field.id] = answers[field.id]?.value === true;
      });
      return next;
    });
    setSignatureValue(signatureField ? stringValue(answers[signatureField.id]) || null : null);
    setDateValue(dateField ? stringValue(answers[dateField.id]) || today() : today());
    setError("");
  }, [answers, dateField, declarationFields, signatureField]);

  const section = sectionLabels.declaration;

  function toggleDeclaration(fieldId: string) {
    setConfirmed((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
    setError("");
  }

  function continueDeclaration() {
    const unconfirmed = declarationFields.filter((field) => !confirmed[field.id]);
    if (unconfirmed.length > 0) {
      setError("Confirm every declaration or use Skip.");
      return;
    }
    if (!signatureValue) {
      setError("Provide a signature or use Skip.");
      return;
    }
    if (!dateValue.trim()) {
      setError("Enter the date or use Skip.");
      return;
    }

    const payload: Record<string, InductionValue> = {};
    declarationFields.forEach((field) => {
      payload[field.id] = confirmed[field.id];
    });
    if (signatureField) payload[signatureField.id] = signatureValue;
    if (dateField) payload[dateField.id] = dateValue;
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
        <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Confirm, sign and date</h2>

        <div className="mt-9 space-y-4">
          {declarationFields.map((field) => (
            <div key={field.id} className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
              <p className="text-base font-bold leading-7 text-uplands-charcoal">{field.label}</p>
              <button
                type="button"
                onClick={() => toggleDeclaration(field.id)}
                className={`mt-4 flex min-h-12 w-full items-center gap-4 border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                  confirmed[field.id] ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-current text-lg">
                  {confirmed[field.id] ? "✓" : ""}
                </span>
                <span className="font-bold">{field.confirmLabel}</span>
              </button>
            </div>
          ))}

          {signatureField && (
            <div className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
              <p className="mb-4 text-base font-bold text-uplands-charcoal">{signatureField.label}</p>
              <SignaturePad value={signatureValue} onChange={setSignatureValue} />
            </div>
          )}

          {dateField && (
            <div className="border border-zinc-200 bg-white p-5 shadow-soft sm:p-6">
              <label htmlFor="declaration-date" className="mb-3 block text-base font-bold text-uplands-charcoal">
                {dateField.label}
              </label>
              <input
                id="declaration-date"
                type="date"
                value={dateValue}
                onChange={(event) => {
                  setDateValue(event.target.value);
                  setError("");
                }}
                className="min-h-14 w-full border-b-2 border-zinc-300 bg-transparent text-xl outline-none transition focus:border-uplands-magenta"
                aria-label={dateField.label}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-6 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
            {error}
          </p>
        )}

        {!onCancel && <ProgressBar progress={progress} current={current} total={total} />}
      </div>
      {onCancel ? (
        <ModalActions onCancel={onCancel} onSave={continueDeclaration} />
      ) : (
        <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueDeclaration} />
      )}
    </div>
  );
}
