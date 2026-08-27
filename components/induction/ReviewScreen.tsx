"use client";

import { sectionLabels } from "@/config/uhsf1601Schema";
import { calculateCompletionStatus, displayAnswer } from "@/hooks/useInduction";
import type { InductionField, InductionRecord } from "@/types/induction";
import { NavigationControls } from "./NavigationControls";

type ReviewScreenProps = {
  record: InductionRecord;
  fields: InductionField[];
  onBack: () => void;
  onSkip: () => void;
  onSubmit: () => void;
  onEdit: (fieldId: string) => void;
  submitBusy?: boolean;
  submitError?: string;
};

const sectionOrder = ["personal", "competence", "declaration"] as const;

export function ReviewScreen({ record, fields, onBack, onSkip, onSubmit, onEdit, submitBusy = false, submitError = "" }: ReviewScreenProps) {
  const status = calculateCompletionStatus(record.answers);
  const ramsBriefingAnswer = record.answers.ramsBriefing;
  const needsRamsWarning = ramsBriefingAnswer?.value === "No" || ramsBriefingAnswer?.skipped;

  return (
    <div className="min-h-screen px-5 pb-0 pt-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="font-din text-sm uppercase text-uplands-magenta">Before submission</p>
        <h2 className="mt-3 font-slab text-4xl font-light leading-tight text-uplands-charcoal sm:text-5xl">Review Site Induction</h2>
        <p className="mt-5 text-lg text-zinc-600">
          Check the captured answers. Skipped fields are shown as Not provided and conditional fields are shown as Not applicable where relevant.
        </p>
        <div className="mt-6 inline-flex min-h-12 items-center bg-white px-4 font-bold shadow-soft">
          Current status: <span className="ml-2 text-uplands-magenta">{status}</span>
        </div>
        {needsRamsWarning && (
          <div className="mt-6 border-l-4 border-uplands-magenta bg-white p-5 text-sm font-bold leading-6 text-uplands-charcoal shadow-soft">
            Your induction can be recorded, however the original Uplands form states that no one is permitted to commence work without being briefed on their Risk Assessment and Method Statement.
          </div>
        )}
        {submitError && (
          <div className="mt-6 border-l-4 border-red-600 bg-white p-5 text-sm font-bold leading-6 text-red-700 shadow-soft" role="alert">
            {submitError}
          </div>
        )}

        <div className="mt-10 space-y-8">
          {sectionOrder.map((section) => (
            <section key={section} className="bg-white p-5 shadow-soft sm:p-7">
              <h3 className="font-slab text-2xl font-light text-uplands-charcoal">{sectionLabels[section].title}</h3>
              <div className="mt-5 divide-y divide-zinc-200">
                {fields
                  .filter((field) => field.section === section)
                  .map((field) => (
                    <div key={field.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)_auto] sm:items-center">
                      <div>
                        <p className="font-bold text-zinc-900">{field.label}</p>
                        {field.originalLabel && <p className="mt-1 text-sm uppercase text-zinc-500">{field.originalLabel}</p>}
                      </div>
                      {field.type === "upload" && typeof record.answers[field.id]?.value === "string" ? (
                        <img
                          src={record.answers[field.id].value as string}
                          alt={field.label}
                          className="max-h-40 w-full max-w-[240px] rounded border border-zinc-200 bg-white object-contain"
                        />
                      ) : (
                        <p className="text-zinc-700">{displayAnswer(field, record.answers[field.id])}</p>
                      )}
                      {field.type !== "information" && (
                        <button
                          type="button"
                          onClick={() => onEdit(field.id)}
                          className="min-h-11 justify-self-start border border-zinc-300 px-4 font-bold text-uplands-magenta focus:outline-none focus:ring-2 focus:ring-uplands-magenta"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <NavigationControls
        canGoBack
        onBack={onBack}
        onSkip={onSkip}
        onContinue={onSubmit}
        continueLabel={submitBusy ? "Saving" : "Submit induction"}
        continueDisabled={submitBusy}
        showSkip={false}
      />
    </div>
  );
}
