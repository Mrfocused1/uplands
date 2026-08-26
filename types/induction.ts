export type InductionSection = "personal" | "competence" | "declaration" | "acknowledgement";

export type InductionRole = "inductee" | "inductor";

export type InductionFieldType =
  | "text"
  | "phone"
  | "address"
  | "textarea"
  | "date"
  | "yes-no"
  | "presence"
  | "copy-status"
  | "declaration"
  | "signature"
  | "information"
  | "medical"
  | "upload";

export type InductionValue = string | boolean | null;

export type CompletionStatus = "COMPLETE" | "INCOMPLETE" | "REQUIRES REVIEW";

export type ConditionalRule = {
  field: string;
  equals?: unknown;
  hasValue?: boolean;
};

export type AutoNotApplicableRule = {
  field: string;
  equals?: unknown;
  skipped?: boolean;
  missing?: boolean;
  reason: string;
};

export type InductionField = {
  id: string;
  section: InductionSection;
  label: string;
  originalLabel?: string;
  description?: string;
  note?: string;
  warning?: string;
  placeholder?: string;
  type: InductionFieldType;
  role: InductionRole;
  allowSkip: true;
  options?: string[];
  confirmLabel?: string;
  conditional?: ConditionalRule;
  autoNotApplicableWhen?: AutoNotApplicableRule[];
  defaultToday?: boolean;
};

export type FieldAnswer = {
  value: InductionValue;
  skipped?: boolean;
  skippedAt?: string;
  notApplicable?: boolean;
  notApplicableReason?: string;
  updatedAt: string;
};

export type InductionRecord = {
  sessionId: string;
  reference?: string;
  formVersion: string;
  currentStepId: string;
  answers: Record<string, FieldAnswer>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  status?: CompletionStatus;
};

export type DocumentMetadata = {
  code: "UHSF16.01";
  title: "SITE INDUCTION REGISTRATION FORM";
  issued: "08.11.2022";
  documentType: "FORM";
  documentCreatedBy: "HSEQ Dept";
  status: "APPROVED";
  page: "1 of 1";
};
