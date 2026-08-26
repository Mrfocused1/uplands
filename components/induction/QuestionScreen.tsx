"use client";

import { useEffect, useMemo, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { SignaturePad } from "./SignaturePad";

type QuestionScreenProps = {
  field: InductionField;
  answer?: FieldAnswer;
  defaultValue: InductionValue;
  current: number;
  total: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: (value: InductionValue) => void;
  onInformationContinue: () => void;
};

function valueToString(value: InductionValue | undefined) {
  return typeof value === "string" ? value : "";
}

export function QuestionScreen({
  field,
  answer,
  defaultValue,
  current,
  total,
  progress,
  canGoBack,
  onBack,
  onSkip,
  onContinue,
  onInformationContinue,
}: QuestionScreenProps) {
  const [textValue, setTextValue] = useState(valueToString(answer?.value ?? defaultValue));
  const [choiceValue, setChoiceValue] = useState<string | boolean | null>(answer?.value ?? null);
  const [medicalChoice, setMedicalChoice] = useState<"Yes" | "No" | "">(() => {
    if (answer?.value === "No") return "No";
    if (typeof answer?.value === "string" && answer.value.length > 0) return "Yes";
    return "";
  });
  const [signatureValue, setSignatureValue] = useState<string | null>(valueToString(answer?.value));
  const [error, setError] = useState("");

  useEffect(() => {
    setTextValue(valueToString(answer?.value ?? defaultValue));
    setChoiceValue(answer?.value ?? null);
    setSignatureValue(valueToString(answer?.value));
    setMedicalChoice(() => {
      if (answer?.value === "No") return "No";
      if (typeof answer?.value === "string" && answer.value.length > 0) return "Yes";
      return "";
    });
    setError("");
  }, [answer, defaultValue, field.id]);

  const section = sectionLabels[field.section];
  const roleLabel = field.role === "inductor" ? "Uplands Inductor" : "Inductee";
  const continueLabel = field.id === "inducteeComplete" ? "Continue as Uplands Inductor" : "Continue";

  const selectedValue = useMemo<InductionValue>(() => {
    if (field.type === "declaration") return choiceValue === true;
    if (field.type === "signature") return signatureValue || null;
    if (field.type === "information") return "Viewed";
    if (field.type === "medical") {
      if (medicalChoice === "No") return "No";
      if (medicalChoice === "Yes") return textValue.trim();
      return null;
    }
    if (["yes-no", "presence", "copy-status"].includes(field.type)) return typeof choiceValue === "string" ? choiceValue : null;
    return textValue.trim();
  }, [choiceValue, field.type, medicalChoice, signatureValue, textValue]);

  function continueCurrent() {
    if (field.type === "information") {
      onInformationContinue();
      return;
    }
    if (field.type === "medical") {
      if (!medicalChoice) {
        setError("Choose Yes, No, or use Skip if you do not want to answer now.");
        return;
      }
      if (medicalChoice === "Yes" && !textValue.trim()) {
        setError("Add the voluntary information, choose No, or use Skip.");
        return;
      }
    } else if ((field.type === "yes-no" || field.type === "presence" || field.type === "copy-status") && selectedValue === null) {
      setError("Choose an option or use Skip.");
      return;
    } else if (field.type === "declaration" && selectedValue !== true) {
      setError("Use the acknowledgement control or use Skip.");
      return;
    } else if (field.type === "signature" && !signatureValue) {
      setError("Confirm a signature or use Skip.");
      return;
    } else if (["text", "phone", "address", "textarea", "date"].includes(field.type) && !String(selectedValue ?? "").trim()) {
      setError("Enter a response or use Skip.");
      return;
    }
    onContinue(selectedValue);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key === "Escape") {
        onSkip();
      }
      if (event.key === "Enter" && target?.tagName !== "TEXTAREA") {
        event.preventDefault();
        continueCurrent();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="min-h-[calc(100vh-6rem)] px-5 pb-0 pt-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="bg-uplands-magenta px-3 py-1 font-din text-xs uppercase text-white">{roleLabel}</span>
          <span className="text-sm font-bold uppercase text-zinc-500">{section.title}</span>
        </div>

        <div className="transition duration-200">
          {field.id === "inducteeComplete" && (
            <div className="mb-6 border-l-4 border-uplands-magenta bg-white p-4 text-sm text-zinc-700 shadow-soft">
              The inductee section is complete. The following acknowledgement screens are visually marked for Uplands Inductor completion.
            </div>
          )}

          <p className="mb-3 font-din text-sm uppercase text-uplands-magenta">{section.subtitle}</p>
          <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">{field.label}</h2>

          {field.description && <p className="mt-5 text-lg leading-8 text-zinc-600">{field.description}</p>}
          {field.note && <p className="mt-4 border-l-4 border-zinc-300 pl-4 text-base text-zinc-600">{field.note}</p>}
          {field.warning && <p className="mt-6 border-l-4 border-uplands-magenta bg-white p-4 text-base font-bold text-uplands-charcoal shadow-soft">{field.warning}</p>}

          <div className="mt-9">
            {field.type === "information" && (
              <div className="border border-zinc-200 bg-white p-6 shadow-soft">
                <p className="text-lg text-zinc-700">Continue to move to the next stage, or Skip to record that this stage was not completed now.</p>
              </div>
            )}

            {(field.type === "text" || field.type === "phone" || field.type === "date") && (
              <input
                autoFocus
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                type={field.type === "phone" ? "tel" : field.type}
                inputMode={field.type === "phone" ? "tel" : undefined}
                placeholder={field.placeholder}
                className="min-h-16 w-full border-b-2 border-zinc-300 bg-transparent text-2xl outline-none transition placeholder:text-zinc-400 focus:border-uplands-magenta sm:text-3xl"
                aria-label={field.label}
              />
            )}

            {(field.type === "address" || field.type === "textarea") && (
              <textarea
                autoFocus
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                rows={6}
                className="w-full resize-y border border-zinc-300 bg-white p-4 text-xl outline-none transition placeholder:text-zinc-400 focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/20"
                aria-label={field.label}
              />
            )}

            {field.type === "medical" && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Yes", "No"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMedicalChoice(option as "Yes" | "No");
                        setError("");
                      }}
                      className={`min-h-16 border p-5 text-left text-xl font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                        medicalChoice === option ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {medicalChoice === "Yes" && (
                  <div>
                    <label htmlFor="medical-info" className="mb-3 block font-din text-sm uppercase text-uplands-charcoal">
                      Medical condition / prescription medication information
                    </label>
                    <textarea
                      id="medical-info"
                      autoFocus
                      value={textValue}
                      onChange={(event) => setTextValue(event.target.value)}
                      rows={7}
                      className="w-full resize-y border border-zinc-300 bg-white p-4 text-lg outline-none focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/20"
                    />
                    <p className="mt-3 text-sm leading-6 text-zinc-600">{field.description}</p>
                  </div>
                )}
              </div>
            )}

            {field.type === "yes-no" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {["Yes", "No"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setChoiceValue(option);
                      setError("");
                    }}
                    className={`min-h-20 border p-6 text-left text-2xl font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                      choiceValue === option ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {field.type === "presence" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {["Present", "Not present"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setChoiceValue(option);
                      setError("");
                    }}
                    className={`min-h-20 border p-6 text-left text-xl font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                      choiceValue === option ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {field.type === "copy-status" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {["Copy taken", "Not taken"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setChoiceValue(option);
                      setError("");
                    }}
                    className={`min-h-20 border p-6 text-left text-xl font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                      choiceValue === option ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {field.type === "declaration" && (
              <button
                type="button"
                onClick={() => {
                  setChoiceValue(choiceValue === true ? null : true);
                  setError("");
                }}
                className={`flex min-h-20 w-full items-center gap-4 border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                  choiceValue === true ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-current text-2xl">{choiceValue === true ? "✓" : ""}</span>
                <span className="text-xl font-bold">{field.confirmLabel}</span>
              </button>
            )}

            {field.type === "signature" && <SignaturePad value={signatureValue} onChange={setSignatureValue} />}

            {answer?.skipped && (
              <p className="mt-5 border-l-4 border-zinc-400 bg-white p-4 text-sm text-zinc-700">Previously skipped. Answering this question will replace the skipped status.</p>
            )}

            {field.id === "ramsBriefing" && choiceValue === "No" && (
              <p className="mt-5 border-l-4 border-uplands-magenta bg-white p-4 text-sm font-bold text-uplands-charcoal">
                Your induction can be recorded, however the original Uplands form states that no one is permitted to commence work without being briefed on their Risk Assessment and Method Statement.
              </p>
            )}

            {error && (
              <p className="mt-5 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <ProgressBar progress={progress} current={current} total={total} />
      </div>
      <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueCurrent} continueLabel={continueLabel} />
    </div>
  );
}
