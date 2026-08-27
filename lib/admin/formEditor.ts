import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

export type FormFieldKey = Exclude<keyof UHSF1601PrintData, "uploadedDocuments">;

export type FormEditorKind = "text" | "textarea" | "date" | "yesNo" | "present" | "copy" | "confirm";

export interface FormEditorField {
  key: FormFieldKey;
  label: string;
  kind: FormEditorKind;
  /** Labels used for the tri-state boolean selector (true / false). */
  trueLabel?: string;
  falseLabel?: string;
}

export interface FormEditorSection {
  title: string;
  fields: FormEditorField[];
}

export const FORM_EDIT_SECTIONS: FormEditorSection[] = [
  {
    title: "Inductee — Personal Details",
    fields: [
      { key: "fullName", label: "Full name", kind: "text" },
      { key: "contactNumber", label: "Contact number", kind: "text" },
      { key: "homeAddress", label: "Home address", kind: "textarea" },
      { key: "companyName", label: "Company name", kind: "text" },
      { key: "occupation", label: "Occupation", kind: "text" },
      { key: "emergencyContactName", label: "Emergency contact", kind: "text" },
      { key: "emergencyContactTelephone", label: "Emergency contact telephone", kind: "text" },
      { key: "medicalInformation", label: "Medical information", kind: "textarea" },
    ],
  },
  {
    title: "Competence & Training",
    fields: [
      { key: "cscsCardNumber", label: "CSCS card number", kind: "text" },
      { key: "cscsExpiry", label: "CSCS expiry", kind: "date" },
      { key: "asbestosCertificatePresent", label: "Asbestos Awareness certificate", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "scaffolding", label: "Erecting scaffolding", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "cisrsNumber", label: "CISRS number", kind: "text" },
      { key: "cisrsExpiry", label: "CISRS expiry", kind: "date" },
      { key: "operatingPlant", label: "Operating plant", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "cpcsNumber", label: "CPCS number", kind: "text" },
      { key: "cpcsExpiry", label: "CPCS expiry", kind: "date" },
      { key: "clientSpecificTraining", label: "Client specific training", kind: "text" },
      { key: "clientTrainingCompletionDate", label: "Client training completion date", kind: "date" },
      { key: "clientTrainingExpiryDate", label: "Client training expiry", kind: "date" },
      { key: "trainedFirstAider", label: "Trained First Aider", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "trainedFireWarden", label: "Trained Fire Warden", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "supervisor", label: "Supervisor", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "currentSmstsOrSssts", label: "Current SMSTS / SSSTS", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "ipaf", label: "IPAF", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "pasma", label: "PASMA", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
      { key: "ramsBriefed", label: "RAMS briefed", kind: "yesNo", trueLabel: "Yes", falseLabel: "No" },
    ],
  },
  {
    title: "Safe Working Declaration",
    fields: [
      { key: "confirmedRamsDeclaration", label: "RAMS declaration", kind: "confirm", trueLabel: "Confirmed", falseLabel: "Not confirmed" },
      { key: "confirmedSiteRulesDeclaration", label: "Site rules declaration", kind: "confirm", trueLabel: "Confirmed", falseLabel: "Not confirmed" },
      { key: "confirmedPpeDeclaration", label: "PPE declaration", kind: "confirm", trueLabel: "Confirmed", falseLabel: "Not confirmed" },
      { key: "declarationDate", label: "Declaration date", kind: "date" },
    ],
  },
  {
    title: "Acknowledgement — Uplands Inductor",
    fields: [
      { key: "siteName", label: "Site name", kind: "text" },
      { key: "hardHatPresent", label: "Hard hat", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "highVisPresent", label: "High visibility vest", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "glovesPresent", label: "Gloves", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "bootsPresent", label: "Boots", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "safetyEyewearPresent", label: "Safety eyewear", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "rpePresent", label: "RPE", kind: "present", trueLabel: "Present", falseLabel: "Not present" },
      { key: "inductorName", label: "Inductor name", kind: "text" },
      { key: "inductorDate", label: "Induction date", kind: "date" },
      { key: "inductorJobTitle", label: "Inductor job title", kind: "text" },
    ],
  },
  {
    title: "Copies Taken",
    fields: [
      { key: "cscsCopyTaken", label: "CSCS", kind: "copy", trueLabel: "Copy taken", falseLabel: "Not taken" },
      { key: "aaCertificateCopyTaken", label: "Asbestos Awareness certificate", kind: "copy", trueLabel: "Copy taken", falseLabel: "Not taken" },
      { key: "ipafCopyTaken", label: "IPAF", kind: "copy", trueLabel: "Copy taken", falseLabel: "Not taken" },
      { key: "spaCopyTaken", label: "SPA", kind: "copy", trueLabel: "Copy taken", falseLabel: "Not taken" },
    ],
  },
];

export const FORM_EDIT_FIELDS: FormEditorField[] = FORM_EDIT_SECTIONS.flatMap((section) => section.fields);

const STRING_KINDS: FormEditorKind[] = ["text", "textarea", "date"];

export function isStringField(kind: FormEditorKind): boolean {
  return STRING_KINDS.includes(kind);
}
