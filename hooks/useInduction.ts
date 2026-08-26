"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { projectConfig } from "@/config/projectConfig";
import { uhsf1601Schema } from "@/config/uhsf1601Schema";
import type { CompletionStatus, FieldAnswer, InductionField, InductionRecord, InductionValue } from "@/types/induction";
import { createInitialRecord, useInductionPersistence } from "./useInductionPersistence";

const reviewStepId = "review";
const completionStepId = "completion";

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function answerValue(answer?: FieldAnswer) {
  if (!answer || answer.skipped || answer.notApplicable) return null;
  return answer.value;
}

function hasAnswer(answer?: FieldAnswer) {
  const value = answerValue(answer);
  return typeof value === "string" ? value.trim().length > 0 : value !== null;
}

function conditionMet(field: InductionField, answers: InductionRecord["answers"]) {
  if (!field.conditional) return true;
  const controlling = answers[field.conditional.field];
  if (field.conditional.hasValue) return hasAnswer(controlling);
  return answerValue(controlling) === field.conditional.equals;
}

function notApplicableAnswer(field: InductionField, answers: InductionRecord["answers"]): FieldAnswer | null {
  const rule = field.autoNotApplicableWhen?.find((candidate) => {
    const controlling = answers[candidate.field];
    if (candidate.skipped && controlling?.skipped) return true;
    if (candidate.missing && !hasAnswer(controlling)) return true;
    if ("equals" in candidate && answerValue(controlling) === candidate.equals) return true;
    return false;
  });

  return rule
    ? {
        value: null,
        notApplicable: true,
        notApplicableReason: rule.reason,
        updatedAt: now(),
      }
    : null;
}

function evaluateVisibleFields(answers: InductionRecord["answers"]) {
  const workingAnswers = { ...answers };
  const visible: InductionField[] = [];

  uhsf1601Schema.forEach((field) => {
    const nA = notApplicableAnswer(field, workingAnswers);
    if (nA) {
      workingAnswers[field.id] = nA;
      return;
    }
    if (conditionMet(field, workingAnswers)) visible.push(field);
  });

  return visible;
}

function generateReference() {
  const year = new Date().getFullYear();
  const serial = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
  return `UHSF16-${year}-${serial}`;
}

export function calculateCompletionStatus(answers: InductionRecord["answers"]): CompletionStatus {
  const reviewFields = ["ramsDeclaration", "siteRulesDeclaration", "ppeDeclaration"];
  const criticalDeclarationMissing = reviewFields.some((id) => answerValue(answers[id]) !== true);
  const inducteeSignatureMissing = !hasAnswer(answers.inducteeSignature);
  const rams = answers.ramsBriefing;

  if (criticalDeclarationMissing || inducteeSignatureMissing || rams?.skipped || answerValue(rams) === "No" || !rams) {
    return "REQUIRES REVIEW";
  }

  const anySkipped = uhsf1601Schema.some((field) => answers[field.id]?.skipped);
  const anyMissingVisible = uhsf1601Schema.some((field) => conditionMet(field, answers) && !answers[field.id]);

  if (anySkipped || anyMissingVisible) return "INCOMPLETE";
  return "COMPLETE";
}

export function displayAnswer(field: InductionField, answer?: FieldAnswer) {
  if (!answer) return "Not provided";
  if (answer.notApplicable) return "Not applicable";
  if (answer.skipped) return "Not provided";
  if (field.type === "declaration") return answer.value === true ? "Confirmed" : "Not confirmed";
  if (field.type === "presence") return answer.value === "Present" ? "Present" : "Not present";
  if (field.type === "copy-status") return answer.value === "Copy taken" ? "Copy taken" : "Not taken";
  if (field.type === "signature") return answer.value ? "Signature provided" : "Signature not provided";
  if (answer.value === true) return "Yes";
  if (answer.value === false) return "No";
  return answer.value ? String(answer.value) : "Not provided";
}

export function useInduction() {
  const firstStepId = uhsf1601Schema[0].id;
  const { record, updateRecord, resetRecord, hasLoaded } = useInductionPersistence(firstStepId);
  const [screen, setScreen] = useState<"wizard" | "review" | "completion" | "record">("wizard");
  const [stepId, setStepId] = useState(firstStepId);

  useEffect(() => {
    if (hasLoaded && record.currentStepId && record.currentStepId !== reviewStepId) {
      setStepId(record.currentStepId);
    }
  }, [hasLoaded, record.currentStepId]);

  const visibleFields = useMemo(() => evaluateVisibleFields(record.answers), [record.answers]);

  const currentIndex = Math.max(0, visibleFields.findIndex((field) => field.id === stepId));
  const currentField = visibleFields[currentIndex] ?? visibleFields[0];
  const progress = visibleFields.length ? Math.round(((currentIndex + 1) / visibleFields.length) * 100) : 0;

  const persistAnswer = useCallback(
    (fieldId: string, answer: FieldAnswer) => {
      updateRecord((current) => ({
        ...current,
        currentStepId: fieldId,
        answers: {
          ...current.answers,
          [fieldId]: answer,
        },
      }));
    },
    [updateRecord],
  );

  const applyConditionalNotApplicable = useCallback(
    (answers: InductionRecord["answers"]) => {
      const nextAnswers = { ...answers };
      uhsf1601Schema.forEach((field) => {
        const nA = notApplicableAnswer(field, nextAnswers);
        if (nA) nextAnswers[field.id] = nA;
      });
      return nextAnswers;
    },
    [],
  );

  const goToIndex = useCallback(
    (index: number) => {
      const target = visibleFields[Math.max(0, Math.min(index, visibleFields.length - 1))];
      if (target) {
        setStepId(target.id);
        updateRecord((current) => ({ ...current, currentStepId: target.id }));
      }
    },
    [updateRecord, visibleFields],
  );

  const continueWithValue = useCallback(
    (value: InductionValue) => {
      if (!currentField) return;
      updateRecord((current) => {
        const answers = applyConditionalNotApplicable({
          ...current.answers,
          [currentField.id]: {
            value,
            updatedAt: now(),
          },
        });
        const nextVisible = evaluateVisibleFields(answers);
        const nextIndex = nextVisible.findIndex((field) => field.id === currentField.id) + 1;
        const nextStep = nextVisible[nextIndex];
        if (nextStep) {
          setStepId(nextStep.id);
        } else {
          setScreen("review");
        }
        return {
          ...current,
          currentStepId: nextStep?.id ?? reviewStepId,
          answers,
        };
      });
    },
    [applyConditionalNotApplicable, currentField, updateRecord],
  );

  const skipCurrent = useCallback(() => {
    if (screen === "review") {
      setScreen("completion");
      return;
    }

    if (!currentField) return;
    updateRecord((current) => {
      const answers = applyConditionalNotApplicable({
        ...current.answers,
        [currentField.id]: {
          value: null,
          skipped: true,
          skippedAt: now(),
          updatedAt: now(),
        },
      });
      const nextVisible = evaluateVisibleFields(answers);
      const nextIndex = nextVisible.findIndex((field) => field.id === currentField.id) + 1;
      const nextStep = nextVisible[nextIndex];
      if (nextStep) {
        setStepId(nextStep.id);
      } else {
        setScreen("review");
      }
      return {
        ...current,
        currentStepId: nextStep?.id ?? reviewStepId,
        answers,
      };
    });
  }, [applyConditionalNotApplicable, currentField, screen, updateRecord]);

  const submit = useCallback(() => {
    updateRecord((current) => {
      const submitted = {
        ...current,
        reference: current.reference ?? generateReference(),
        submittedAt: current.submittedAt ?? now(),
        status: calculateCompletionStatus(current.answers),
      };
      return submitted;
    });
    setScreen("completion");
  }, [updateRecord]);

  const startAnother = useCallback(() => {
    window.localStorage.removeItem(projectConfig.storageKey);
    resetRecord();
    setStepId(firstStepId);
    setScreen("wizard");
  }, [firstStepId, resetRecord]);

  const editField = useCallback(
    (fieldId: string) => {
      const targetField = uhsf1601Schema.find((field) => field.id === fieldId);
      const isVisible = visibleFields.some((field) => field.id === fieldId);
      setStepId(isVisible ? fieldId : targetField?.conditional?.field ?? fieldId);
      setScreen("wizard");
    },
    [visibleFields],
  );

  const continueInfo = useCallback(() => {
    continueWithValue(currentField?.id === "inducteeComplete" ? "Continue as Uplands Inductor" : "Viewed");
  }, [continueWithValue, currentField?.id]);

  const defaultValue = currentField?.defaultToday && !record.answers[currentField.id] ? today() : answerValue(record.answers[currentField?.id ?? ""]);

  return {
    record: record.sessionId ? record : createInitialRecord(firstStepId),
    hasLoaded,
    fields: uhsf1601Schema,
    visibleFields,
    currentField,
    currentIndex,
    progress,
    screen,
    stepId,
    currentAnswer: currentField ? record.answers[currentField.id] : undefined,
    defaultValue,
    goBack: () => {
      if (screen === "review") {
        setScreen("wizard");
        goToIndex(visibleFields.length - 1);
      } else {
        goToIndex(currentIndex - 1);
      }
    },
    canGoBack: screen === "review" || currentIndex > 0,
    continueWithValue,
    continueInfo,
    persistAnswer,
    skipCurrent,
    editField,
    submit,
    startAnother,
    setScreen,
  };
}
