"use client";

import { useEffect, useState } from "react";
import type { FieldAnswer, InductionField, InductionValue } from "@/types/induction";
import { sectionLabels } from "@/config/uhsf1601Schema";
import { NavigationControls } from "./NavigationControls";
import { ProgressBar } from "./ProgressBar";
import { ModalActions } from "./ModalActions";

type EmergencyContactScreenProps = {
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

type MedicalChoice = "Yes" | "No" | "";

function stringValue(answer: FieldAnswer | undefined) {
  return typeof answer?.value === "string" ? answer.value : "";
}

export function EmergencyContactScreen({
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
}: EmergencyContactScreenProps) {
  const nameField = fields.find((field) => field.id === "emergencyContactName");
  const telephoneField = fields.find((field) => field.id === "emergencyContactTelephone");
  const medicalField = fields.find((field) => field.id === "medicalInformation");
  const [nameValue, setNameValue] = useState(() => stringValue(nameField ? answers[nameField.id] : undefined));
  const [telephoneValue, setTelephoneValue] = useState(() => stringValue(telephoneField ? answers[telephoneField.id] : undefined));
  const [medicalChoice, setMedicalChoice] = useState<MedicalChoice>(() => {
    const value = stringValue(medicalField ? answers[medicalField.id] : undefined);
    if (value === "No") return "No";
    return value ? "Yes" : "";
  });
  const [medicalValue, setMedicalValue] = useState(() => {
    const value = stringValue(medicalField ? answers[medicalField.id] : undefined);
    return value === "No" ? "" : value;
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setNameValue(stringValue(nameField ? answers[nameField.id] : undefined));
    setTelephoneValue(stringValue(telephoneField ? answers[telephoneField.id] : undefined));
    const medicalAnswer = stringValue(medicalField ? answers[medicalField.id] : undefined);
    setMedicalChoice(medicalAnswer === "No" ? "No" : medicalAnswer ? "Yes" : "");
    setMedicalValue(medicalAnswer === "No" ? "" : medicalAnswer);
    setError("");
  }, [answers, medicalField, nameField, telephoneField]);

  function continueDetails() {
    if (!nameValue.trim() || !telephoneValue.trim()) {
      setError("Complete the emergency contact fields or use Skip.");
      return;
    }
    if (!medicalChoice) {
      setError("Choose Yes or No for medical information, or use Skip.");
      return;
    }
    if (medicalChoice === "Yes" && !medicalValue.trim()) {
      setError("Add the voluntary medical information or choose No.");
      return;
    }

    const payload: Record<string, InductionValue> = {};
    if (nameField) payload[nameField.id] = nameValue.trim();
    if (telephoneField) payload[telephoneField.id] = telephoneValue.trim();
    if (medicalField) payload[medicalField.id] = medicalChoice === "No" ? "No" : medicalValue.trim();
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
        <h2 className="font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Emergency contact</h2>

        <div className="mt-9 space-y-7">
          {nameField && (
            <div>
              <label htmlFor="emergency-contact-name" className="mb-2 block text-base font-bold text-uplands-charcoal">
                {nameField.label}
              </label>
              <input
                id="emergency-contact-name"
                autoFocus
                value={nameValue}
                onChange={(event) => {
                  setNameValue(event.target.value);
                  setError("");
                }}
                type="text"
                placeholder={nameField.placeholder}
                className="min-h-14 w-full border-b-2 border-zinc-300 bg-transparent text-xl outline-none transition placeholder:text-zinc-400 focus:border-uplands-magenta sm:text-2xl"
              />
            </div>
          )}

          {telephoneField && (
            <div>
              <label htmlFor="emergency-contact-telephone" className="mb-2 block text-base font-bold text-uplands-charcoal">
                {telephoneField.label}
              </label>
              <input
                id="emergency-contact-telephone"
                value={telephoneValue}
                onChange={(event) => {
                  setTelephoneValue(event.target.value);
                  setError("");
                }}
                type="tel"
                inputMode="tel"
                placeholder={telephoneField.placeholder}
                className="min-h-14 w-full border-b-2 border-zinc-300 bg-transparent text-xl outline-none transition placeholder:text-zinc-400 focus:border-uplands-magenta sm:text-2xl"
              />
            </div>
          )}

          {medicalField && (
            <div>
              <p className="text-base font-bold leading-7 text-uplands-charcoal">{medicalField.label}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["Yes", "No"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setMedicalChoice(option);
                      if (option === "No") setMedicalValue("");
                      setError("");
                    }}
                    className={`min-h-14 border p-4 text-left text-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta ${
                      medicalChoice === option ? "border-uplands-magenta bg-uplands-magenta text-white" : "border-zinc-300 bg-white text-uplands-charcoal"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {medicalChoice === "Yes" && (
                <div className="mt-5">
                  <label htmlFor="medical-information" className="mb-3 block text-sm font-bold text-uplands-charcoal">
                    Medical condition / prescription medication information
                  </label>
                  <textarea
                    id="medical-information"
                    value={medicalValue}
                    onChange={(event) => {
                      setMedicalValue(event.target.value);
                      setError("");
                    }}
                    rows={5}
                    className="w-full resize-y border border-zinc-300 bg-white p-4 text-lg outline-none focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/20"
                  />
                  {medicalField.description && <p className="mt-3 text-sm leading-6 text-zinc-600">{medicalField.description}</p>}
                </div>
              )}
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
        <ModalActions onCancel={onCancel} onSave={continueDetails} />
      ) : (
        <NavigationControls canGoBack={canGoBack} onBack={onBack} onSkip={onSkip} onContinue={continueDetails} />
      )}
    </div>
  );
}
