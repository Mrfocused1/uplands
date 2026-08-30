import assert from "node:assert/strict";
import test from "node:test";

import { lifecycleActions, validatePermitUpdate, type PermitValidationState } from "../lib/permits/lifecycle.ts";

function baseState(patch: Partial<PermitValidationState> = {}): PermitValidationState {
  return {
    currentStatus: "DRAFT",
    nextStatus: "AWAITING_REVIEW",
    contractor: "K&G",
    fields: [{ key: "taskRiskLevel", label: "Task Risk Level", required: true }],
    fieldValues: [{ fieldKey: "taskRiskLevel", value: "Medium" }],
    questions: [
      { key: "rams", prompt: "Has a RAMS been prepared and approved?", requiresCommentOn: ["NO"] },
      { key: "weather", prompt: "Are adverse weather conditions present or forecast?", requiresCommentOn: ["YES"] },
    ],
    answers: [
      { questionKey: "rams", answer: "YES", comment: null },
      { questionKey: "weather", answer: "NO", comment: null },
    ],
    signatures: [],
    ...patch,
  };
}

test("permit lifecycle actions expose the next allowed workflow steps", () => {
  assert.deepEqual(lifecycleActions("DRAFT"), [{ label: "Submit for Review", status: "AWAITING_REVIEW" }]);
  assert.deepEqual(lifecycleActions("WORK_COMPLETED"), [{ label: "Close Permit", status: "CLOSED" }]);
  assert.deepEqual(lifecycleActions("CLOSED"), []);
});

test("permit validation rejects invalid status transitions", () => {
  assert.match(validatePermitUpdate(baseState({ currentStatus: "DRAFT", nextStatus: "CLOSED" })), /cannot move from DRAFT to CLOSED/);
});

test("permit validation requires configured comments for selected answers", () => {
  const message = validatePermitUpdate(
    baseState({
      answers: [
        { questionKey: "rams", answer: "NO", comment: "" },
        { questionKey: "weather", answer: "NO", comment: null },
      ],
    }),
  );

  assert.equal(message, "Comment required for: Has a RAMS been prepared and approved?");
});

test("permit validation enforces signature gates", () => {
  assert.equal(
    validatePermitUpdate(baseState({ currentStatus: "AWAITING_REVIEW", nextStatus: "AUTHORISED" })),
    "Manager authorisation is required before the permit can be authorised or active.",
  );
  assert.equal(
    validatePermitUpdate(
      baseState({
        currentStatus: "AWAITING_REVIEW",
        nextStatus: "AUTHORISED",
        signatures: [{ signatureKey: "manager_authorisation", name: "Site Manager" }],
      }),
    ),
    "",
  );
});
