import type { PermitAnswer, PermitSignatureKey, PermitStatus } from "@/config/permitTemplates";

export const PERMIT_STATUSES: PermitStatus[] = ["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED", "CLOSED", "REJECTED", "EXPIRED", "CANCELLED"];
export const PERMIT_ANSWERS: PermitAnswer[] = ["YES", "NO", "NA"];

export const PERMIT_ALLOWED_TRANSITIONS: Record<PermitStatus, PermitStatus[]> = {
  DRAFT: ["DRAFT", "AWAITING_REVIEW", "CANCELLED"],
  AWAITING_REVIEW: ["AWAITING_REVIEW", "AUTHORISED", "REJECTED", "CANCELLED", "DRAFT"],
  AUTHORISED: ["AUTHORISED", "ACTIVE", "CANCELLED", "EXPIRED"],
  ACTIVE: ["ACTIVE", "WORK_COMPLETED", "CANCELLED", "EXPIRED"],
  WORK_COMPLETED: ["WORK_COMPLETED", "CLOSED"],
  CLOSED: ["CLOSED"],
  REJECTED: ["REJECTED", "DRAFT"],
  EXPIRED: ["EXPIRED"],
  CANCELLED: ["CANCELLED"],
};

export type PermitLifecycleAction = { label: string; status: PermitStatus };

export type PermitValidationField = {
  key: string;
  label: string;
  required: boolean;
};

export type PermitValidationQuestion = {
  key: string;
  prompt: string;
  requiresCommentOn: PermitAnswer[];
};

export type PermitValidationAnswer = {
  questionKey: string;
  answer: PermitAnswer;
  comment: string | null;
};

export type PermitValidationSignature = {
  signatureKey: PermitSignatureKey | string;
  name: string;
};

export type PermitValidationState = {
  currentStatus: PermitStatus;
  nextStatus: PermitStatus;
  contractor: string;
  fields: PermitValidationField[];
  fieldValues: Array<{ fieldKey: string; value: string | null }>;
  questions: PermitValidationQuestion[];
  answers: PermitValidationAnswer[];
  signatures: PermitValidationSignature[];
};

export function isPermitStatus(value: string): value is PermitStatus {
  return PERMIT_STATUSES.includes(value as PermitStatus);
}

export function isPermitAnswer(value: string): value is PermitAnswer {
  return PERMIT_ANSWERS.includes(value as PermitAnswer);
}

export function lifecycleActions(status: PermitStatus): PermitLifecycleAction[] {
  switch (status) {
    case "DRAFT":
      return [{ label: "Submit for Review", status: "AWAITING_REVIEW" }];
    case "AWAITING_REVIEW":
      return [
        { label: "Authorise Permit", status: "AUTHORISED" },
        { label: "Reject Permit", status: "REJECTED" },
      ];
    case "AUTHORISED":
      return [
        { label: "Mark Active", status: "ACTIVE" },
        { label: "Cancel Permit", status: "CANCELLED" },
      ];
    case "ACTIVE":
      return [
        { label: "Mark Work Complete", status: "WORK_COMPLETED" },
        { label: "Cancel Permit", status: "CANCELLED" },
      ];
    case "WORK_COMPLETED":
      return [{ label: "Close Permit", status: "CLOSED" }];
    default:
      return [];
  }
}

export function validatePermitUpdate(state: PermitValidationState) {
  if (!PERMIT_ALLOWED_TRANSITIONS[state.currentStatus].includes(state.nextStatus)) {
    return `Permit cannot move from ${state.currentStatus.replaceAll("_", " ")} to ${state.nextStatus.replaceAll("_", " ")}.`;
  }

  if (!state.contractor.trim()) return "Contractor is required.";

  const requiresAnsweredQuestions = ["AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED", "CLOSED"].includes(state.nextStatus);
  if (requiresAnsweredQuestions) {
    const fieldsByKey = new Map(state.fieldValues.map((fieldValue) => [fieldValue.fieldKey, fieldValue.value?.trim() ?? ""]));
    const missingField = state.fields.find((field) => field.required && !fieldsByKey.get(field.key));
    if (missingField) return `${missingField.label} is required before review or authorisation.`;

    const answersByKey = new Map(state.answers.map((answer) => [answer.questionKey, answer]));
    const missingQuestion = state.questions.find((question) => !answersByKey.has(question.key));
    if (missingQuestion) return "All permit questions need an answer before review or authorisation.";

    const missingCommentQuestion = state.questions.find((question) => {
      const answer = answersByKey.get(question.key);
      if (!answer) return false;
      return question.requiresCommentOn.includes(answer.answer) && !answer.comment?.trim();
    });
    if (missingCommentQuestion) return `Comment required for: ${missingCommentQuestion.prompt}`;
  }

  const signed = new Set(state.signatures.filter((signature) => signature.name.trim()).map((signature) => signature.signatureKey));
  if ((state.nextStatus === "AUTHORISED" || state.nextStatus === "ACTIVE") && !signed.has("manager_authorisation")) return "Manager authorisation is required before the permit can be authorised or active.";
  if (state.nextStatus === "WORK_COMPLETED" && !signed.has("contractor_completion")) return "Contractor completion is required before marking work completed.";
  if (state.nextStatus === "CLOSED" && (!signed.has("contractor_completion") || !signed.has("manager_completion_acceptance"))) return "Contractor completion and manager completion acceptance are required before closure.";

  return "";
}
