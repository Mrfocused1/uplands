"use client";

import { useCallback, useEffect, useState } from "react";
import { projectConfig } from "@/config/projectConfig";
import type { FieldAnswer, InductionRecord } from "@/types/induction";

function createSessionId() {
  return `uhsf16-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createInitialRecord(firstStepId: string, initialAnswers: Record<string, FieldAnswer> = {}, invitationToken?: string): InductionRecord {
  const now = new Date().toISOString();
  return {
    sessionId: createSessionId(),
    formVersion: projectConfig.formVersion,
    currentStepId: firstStepId,
    answers: initialAnswers,
    invitationToken,
    createdAt: now,
    updatedAt: now,
  };
}

export function useInductionPersistence(firstStepId: string, initialAnswers: Record<string, FieldAnswer> = {}, invitationToken?: string) {
  const [record, setRecord] = useState<InductionRecord>(() => createInitialRecord(firstStepId, initialAnswers, invitationToken));
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(projectConfig.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as InductionRecord;
        if (invitationToken && parsed.invitationToken !== invitationToken) {
          setRecord(createInitialRecord(firstStepId, initialAnswers, invitationToken));
        } else {
          setRecord(parsed);
        }
      } catch {
        setRecord(createInitialRecord(firstStepId, initialAnswers, invitationToken));
      }
    } else {
      setRecord(createInitialRecord(firstStepId, initialAnswers, invitationToken));
    }
    setHasLoaded(true);
  }, [firstStepId, initialAnswers, invitationToken]);

  useEffect(() => {
    if (hasLoaded) {
      window.localStorage.setItem(projectConfig.storageKey, JSON.stringify(record));
    }
  }, [hasLoaded, record]);

  const updateRecord = useCallback((updater: (record: InductionRecord) => InductionRecord) => {
    setRecord((current) => {
      const updated = updater(current);
      return {
        ...updated,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const resetRecord = useCallback(() => {
    setRecord(createInitialRecord(firstStepId, initialAnswers, invitationToken));
  }, [firstStepId, initialAnswers, invitationToken]);

  return { record, updateRecord, resetRecord, hasLoaded };
}
