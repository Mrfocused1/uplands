"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { projectConfig } from "@/config/projectConfig";
import { uhsf1601Schema } from "@/config/uhsf1601Schema";
import type { CompletionStatus, FieldAnswer, InductionField, InductionRecord, InductionValue } from "@/types/induction";
import { createInitialRecord, useInductionPersistence } from "./useInductionPersistence";

const reviewStepId = "review";

const inducteeFields = uhsf1601Schema.filter((field) => field.role === "inductee");
const workflowFields = inducteeFields;

type WizardStep =
  | { kind: "field"; field: InductionField }
  | { kind: "group"; groupId: string; fields: InductionField[] };

function stepIdOf(step: WizardStep) {
  return step.kind === "field" ? step.field.id : step.groupId;
}

function buildSteps(visibleFields: InductionField[]): WizardStep[] {
  const steps: WizardStep[] = [];
  const emittedGroups = new Set<string>();
  const visibleIds = new Set(visibleFields.map((field) => field.id));

  for (const field of visibleFields) {
    if (field.group) {
      if (emittedGroups.has(field.group)) continue;
      emittedGroups.add(field.group);
      const groupFields = uhsf1601Schema.filter((item) => item.group === field.group && visibleIds.has(item.id));
      steps.push({ kind: "group", groupId: field.group, fields: groupFields });
      continue;
    }
    steps.push({ kind: "field", field });
  }

  return steps;
}

function nextStepAfter(answers: InductionRecord["answers"], fromId: string) {
  const nextVisible = evaluateVisibleFields(answers);
  const nextSteps = buildSteps(nextVisible);
  const index = nextSteps.findIndex((step) => stepIdOf(step) === fromId);
  const nextStep = nextSteps[index + 1];
  return nextStep ? stepIdOf(nextStep) : null;
}

function stepForField(fieldId: string, visibleFields: InductionField[]): WizardStep {
  const target = uhsf1601Schema.find((field) => field.id === fieldId);
  const fallback = uhsf1601Schema[0];
  if (!target) return { kind: "field", field: fallback };

  if (target.group) {
    return {
      kind: "group",
      groupId: target.group,
      fields: uhsf1601Schema.filter((field) => field.group === target.group),
    };
  }

  if (visibleFields.some((field) => field.id === fieldId)) {
    return { kind: "field", field: target };
  }

  const controllingId = target.conditional?.field ?? fieldId;
  const controlling = uhsf1601Schema.find((field) => field.id === controllingId) ?? target;
  if (controlling.group) {
    return {
      kind: "group",
      groupId: controlling.group,
      fields: uhsf1601Schema.filter((field) => field.group === controlling.group),
    };
  }
  return { kind: "field", field: controlling };
}

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

  workflowFields.forEach((field) => {
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

  const anySkipped = inducteeFields.some((field) => answers[field.id]?.skipped);
  const anyMissingVisible = inducteeFields.some((field) => conditionMet(field, answers) && !answers[field.id]);

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
  if (field.type === "upload") return answer.value ? "Image attached" : "Image not attached";
  if (answer.value === true) return "Yes";
  if (answer.value === false) return "No";
  return answer.value ? String(answer.value) : "Not provided";
}

export function useInduction() {
  const firstStepId = uhsf1601Schema[0].id;
  const { record, updateRecord, resetRecord, hasLoaded } = useInductionPersistence(firstStepId);
  const [screen, setScreen] = useState<"wizard" | "review" | "completion" | "record">("wizard");
  const [stepId, setStepId] = useState(firstStepId);
  const [editStep, setEditStep] = useState<WizardStep | null>(null);

  useEffect(() => {
    if (hasLoaded && record.currentStepId && record.currentStepId !== reviewStepId) {
      setStepId(record.currentStepId);
    }
  }, [hasLoaded, record.currentStepId]);

  const visibleFields = useMemo(() => evaluateVisibleFields(record.answers), [record.answers]);
  const steps = useMemo(() => buildSteps(visibleFields), [visibleFields]);

  const currentIndex = Math.max(0, steps.findIndex((step) => stepIdOf(step) === stepId));
  const currentStep = steps[currentIndex] ?? steps[0];
  const currentField = currentStep?.kind === "field" ? currentStep.field : undefined;
  const currentGroup = currentStep?.kind === "group" ? currentStep.fields : undefined;
  const progress = steps.length ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;

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

  const goToStep = useCallback(
    (id: string) => {
      setStepId(id);
      updateRecord((current) => ({ ...current, currentStepId: id }));
    },
    [updateRecord],
  );

  const goToIndex = useCallback(
    (index: number) => {
      const target = steps[Math.max(0, Math.min(index, steps.length - 1))];
      if (target) goToStep(stepIdOf(target));
    },
    [goToStep, steps],
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
        const nextId = nextStepAfter(answers, currentField.id);
        if (nextId) {
          setStepId(nextId);
        } else {
          setScreen("review");
        }
        return {
          ...current,
          currentStepId: nextId ?? reviewStepId,
          answers,
        };
      });
    },
    [applyConditionalNotApplicable, currentField, updateRecord],
  );

  const continueGroup = useCallback(
    (values: Record<string, InductionValue>) => {
      if (!currentStep || currentStep.kind !== "group") return;
      const { groupId, fields } = currentStep;

      updateRecord((current) => {
        const nextAnswers = { ...current.answers };
        fields.forEach((field) => {
          if (field.id in values) {
            const value = values[field.id];
            nextAnswers[field.id] =
              value === null
                ? { value: null, skipped: true, skippedAt: now(), updatedAt: now() }
                : { value, updatedAt: now() };
          }
        });
        Object.entries(values).forEach(([fieldId, value]) => {
          if (fields.some((field) => field.id === fieldId)) return;
          nextAnswers[fieldId] =
            value === null
              ? { value: null, skipped: true, skippedAt: now(), updatedAt: now() }
              : { value, updatedAt: now() };
        });
        const answers = applyConditionalNotApplicable(nextAnswers);
        const nextId = nextStepAfter(answers, groupId);
        if (nextId) {
          setStepId(nextId);
        } else {
          setScreen("review");
        }
        return {
          ...current,
          currentStepId: nextId ?? reviewStepId,
          answers,
        };
      });
    },
    [applyConditionalNotApplicable, currentStep, updateRecord],
  );

  const skipCurrent = useCallback(() => {
    if (screen === "review") {
      setScreen("completion");
      return;
    }

    if (!currentStep) return;
    updateRecord((current) => {
      let answers: InductionRecord["answers"];
      let fromId: string;

      if (currentStep.kind === "group") {
        const nextAnswers = { ...current.answers };
        currentStep.fields.forEach((field) => {
          nextAnswers[field.id] = {
            value: null,
            skipped: true,
            skippedAt: now(),
            updatedAt: now(),
          };
        });
        answers = applyConditionalNotApplicable(nextAnswers);
        fromId = currentStep.groupId;
      } else {
        answers = applyConditionalNotApplicable({
          ...current.answers,
          [currentStep.field.id]: {
            value: null,
            skipped: true,
            skippedAt: now(),
            updatedAt: now(),
          },
        });
        fromId = currentStep.field.id;
      }

      const nextId = nextStepAfter(answers, fromId);
      if (nextId) {
        setStepId(nextId);
      } else {
        setScreen("review");
      }
      return {
        ...current,
        currentStepId: nextId ?? reviewStepId,
        answers,
      };
    });
  }, [applyConditionalNotApplicable, currentStep, screen, updateRecord]);

  const submit = useCallback((reference?: string) => {
    updateRecord((current) => {
      const submitted = {
        ...current,
        reference: reference ?? current.reference ?? generateReference(),
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

  const openEdit = useCallback(
    (fieldId: string) => {
      setEditStep(stepForField(fieldId, visibleFields));
    },
    [visibleFields],
  );

  const closeEdit = useCallback(() => {
    setEditStep(null);
  }, []);

  const saveEdit = useCallback(
    (values: Record<string, InductionValue>) => {
      if (!editStep) return;
      const fields = editStep.kind === "field" ? [editStep.field] : editStep.fields;
      updateRecord((current) => {
        const nextAnswers = { ...current.answers };
        fields.forEach((field) => {
          if (field.id in values) {
            const value = values[field.id];
            nextAnswers[field.id] =
              value === null
                ? { value: null, skipped: true, skippedAt: now(), updatedAt: now() }
                : { value, updatedAt: now() };
          }
        });
        Object.entries(values).forEach(([fieldId, value]) => {
          if (fields.some((field) => field.id === fieldId)) return;
          nextAnswers[fieldId] =
            value === null
              ? { value: null, skipped: true, skippedAt: now(), updatedAt: now() }
              : { value, updatedAt: now() };
        });
        return { ...current, answers: applyConditionalNotApplicable(nextAnswers) };
      });
      setEditStep(null);
    },
    [editStep, applyConditionalNotApplicable, updateRecord],
  );

  const saveFieldEdit = useCallback(
    (value: InductionValue) => {
      if (!editStep || editStep.kind !== "field") return;
      saveEdit({ [editStep.field.id]: value });
    },
    [editStep, saveEdit],
  );

  const continueInfo = useCallback(() => {
    continueWithValue("Viewed");
  }, [continueWithValue]);

  const defaultValue = currentField?.defaultToday && !record.answers[currentField.id] ? today() : answerValue(record.answers[currentField?.id ?? ""]);

  return {
    record: record.sessionId ? record : createInitialRecord(firstStepId),
    hasLoaded,
    fields: inducteeFields,
    visibleFields,
    steps,
    currentStep,
    currentField,
    currentGroup,
    currentIndex,
    total: steps.length,
    progress,
    screen,
    stepId,
    currentAnswer: currentField ? record.answers[currentField.id] : undefined,
    defaultValue,
    goBack: () => {
      if (screen === "review") {
        setScreen("wizard");
        goToIndex(steps.length - 1);
      } else {
        goToIndex(currentIndex - 1);
      }
    },
    canGoBack: screen === "review" || currentIndex > 0,
    continueWithValue,
    continueGroup,
    continueInfo,
    persistAnswer,
    skipCurrent,
    editStep,
    openEdit,
    closeEdit,
    saveEdit,
    saveFieldEdit,
    submit,
    startAnother,
    setScreen,
  };
}
