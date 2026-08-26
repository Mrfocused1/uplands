"use client";

import { useCallback, useEffect, useState } from "react";
import { projectConfig } from "@/config/projectConfig";
import type { InductionRecord } from "@/types/induction";

function createSessionId() {
  return `uhsf16-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createInitialRecord(firstStepId: string): InductionRecord {
  const now = new Date().toISOString();
  return {
    sessionId: createSessionId(),
    formVersion: projectConfig.formVersion,
    currentStepId: firstStepId,
    answers: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function useInductionPersistence(firstStepId: string) {
  const [record, setRecord] = useState<InductionRecord>(() => createInitialRecord(firstStepId));
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(projectConfig.storageKey);
    if (saved) {
      try {
        setRecord(JSON.parse(saved) as InductionRecord);
      } catch {
        setRecord(createInitialRecord(firstStepId));
      }
    }
    setHasLoaded(true);
  }, [firstStepId]);

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
    setRecord(createInitialRecord(firstStepId));
  }, [firstStepId]);

  return { record, updateRecord, resetRecord, hasLoaded };
}
