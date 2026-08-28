import type { UHSF1601PrintData, UploadedDocument } from "@/types/UHSF1601PrintData";

const MAX_PUBLIC_JSON_BYTES = 25 * 1024 * 1024;
const MAX_EVIDENCE_DATA_URL_BYTES = 8 * 1024 * 1024;
const MAX_STRING_LENGTH = 4_000;
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|heic|heif);base64,[a-zA-Z0-9+/=\s]+$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertPublicPayloadSize(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PUBLIC_JSON_BYTES) {
    throw new ValidationError("The submitted induction payload is too large.");
  }
}

function asRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("A completed induction is required.");
  }
  return input as Record<string, unknown>;
}

function optionalString(value: unknown, field: string) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ValidationError(`${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > MAX_STRING_LENGTH) throw new ValidationError(`${field} is too long.`);
  return trimmed || null;
}

function requiredString(value: unknown, field: string) {
  const text = optionalString(value, field);
  if (!text) throw new ValidationError(`${field} is required.`);
  return text;
}

function optionalBoolean(value: unknown, field: string) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be true or false.`);
  return value;
}

function requiredTrue(value: unknown, field: string) {
  if (value !== true) throw new ValidationError(`${field} must be confirmed.`);
  return true;
}

function optionalDate(value: unknown, field: string) {
  const text = optionalString(value, field);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))) {
    throw new ValidationError(`${field} must be a valid date.`);
  }
  return text;
}

function requiredDate(value: unknown, field: string) {
  return optionalDate(value, field) ?? (() => {
    throw new ValidationError(`${field} is required.`);
  })();
}

function validateSignature(value: unknown) {
  const signature = requiredString(value, "Inductee signature");
  if (!signature.startsWith("data:image/png;base64,")) {
    throw new ValidationError("Inductee signature must be a PNG signature.");
  }
  return signature;
}

function dataUrlSize(value: string) {
  const base64 = value.slice(value.indexOf(",") + 1).replace(/\s/g, "");
  return Math.floor((base64.length * 3) / 4);
}

function validateUploadedDocument(input: unknown): UploadedDocument {
  const value = asRecord(input);
  const id = requiredString(value.id, "Uploaded document id") as UploadedDocument["id"];
  const label = requiredString(value.label, "Uploaded document label");
  const dataUrl = optionalString(value.dataUrl, "Uploaded document data");
  if (dataUrl) {
    if (!DATA_URL_PATTERN.test(dataUrl)) throw new ValidationError(`${label} must be an image upload.`);
    if (dataUrlSize(dataUrl) > MAX_EVIDENCE_DATA_URL_BYTES) throw new ValidationError(`${label} is too large.`);
  }
  return { id, label, dataUrl: dataUrl ?? undefined };
}

export function validateUHSF1601PrintData(input: unknown): UHSF1601PrintData {
  const value = asRecord(input);
  const uploadedDocuments = Array.isArray(value.uploadedDocuments)
    ? value.uploadedDocuments.map(validateUploadedDocument)
    : [];

  return {
    fullName: requiredString(value.fullName, "Full name"),
    contactNumber: requiredString(value.contactNumber, "Contact number"),
    homeAddress: optionalString(value.homeAddress, "Home address"),
    companyName: requiredString(value.companyName, "Company name"),
    occupation: optionalString(value.occupation, "Occupation"),
    emergencyContactName: optionalString(value.emergencyContactName, "Emergency contact name"),
    emergencyContactTelephone: optionalString(value.emergencyContactTelephone, "Emergency contact telephone"),
    medicalInformation: optionalString(value.medicalInformation, "Medical information"),
    cscsCardNumber: optionalString(value.cscsCardNumber, "CSCS card number"),
    cscsExpiry: optionalDate(value.cscsExpiry, "CSCS expiry"),
    asbestosCertificatePresent: optionalBoolean(value.asbestosCertificatePresent, "Asbestos Awareness certificate"),
    scaffolding: optionalBoolean(value.scaffolding, "Scaffolding"),
    cisrsNumber: optionalString(value.cisrsNumber, "CISRS number"),
    cisrsExpiry: optionalDate(value.cisrsExpiry, "CISRS expiry"),
    operatingPlant: optionalBoolean(value.operatingPlant, "Operating plant"),
    cpcsNumber: optionalString(value.cpcsNumber, "CPCS number"),
    cpcsExpiry: optionalDate(value.cpcsExpiry, "CPCS expiry"),
    clientSpecificTraining: optionalString(value.clientSpecificTraining, "Client-specific training"),
    clientTrainingCompletionDate: optionalDate(value.clientTrainingCompletionDate, "Client training completion date"),
    clientTrainingExpiryDate: optionalDate(value.clientTrainingExpiryDate, "Client training expiry date"),
    trainedFirstAider: optionalBoolean(value.trainedFirstAider, "First aider"),
    trainedFireWarden: optionalBoolean(value.trainedFireWarden, "Fire warden"),
    supervisor: optionalBoolean(value.supervisor, "Supervisor"),
    currentSmstsOrSssts: optionalBoolean(value.currentSmstsOrSssts, "SMSTS or SSSTS"),
    ipaf: optionalBoolean(value.ipaf, "IPAF"),
    pasma: optionalBoolean(value.pasma, "PASMA"),
    ramsBriefed: optionalBoolean(value.ramsBriefed, "RAMS briefing"),
    confirmedRamsDeclaration: requiredTrue(value.confirmedRamsDeclaration, "RAMS declaration"),
    confirmedSiteRulesDeclaration: requiredTrue(value.confirmedSiteRulesDeclaration, "Site rules declaration"),
    confirmedPpeDeclaration: requiredTrue(value.confirmedPpeDeclaration, "PPE declaration"),
    inducteeSignature: validateSignature(value.inducteeSignature),
    declarationDate: requiredDate(value.declarationDate, "Declaration date"),
    siteName: optionalString(value.siteName, "Site name"),
    hardHatPresent: optionalBoolean(value.hardHatPresent, "Hard hat"),
    highVisPresent: optionalBoolean(value.highVisPresent, "High visibility vest"),
    glovesPresent: optionalBoolean(value.glovesPresent, "Gloves"),
    bootsPresent: optionalBoolean(value.bootsPresent, "Boots"),
    safetyEyewearPresent: optionalBoolean(value.safetyEyewearPresent, "Safety eyewear"),
    rpePresent: optionalBoolean(value.rpePresent, "RPE"),
    inductorName: optionalString(value.inductorName, "Inductor name"),
    inductorDate: optionalDate(value.inductorDate, "Inductor date"),
    inductorSignature: optionalString(value.inductorSignature, "Inductor signature"),
    inductorJobTitle: optionalString(value.inductorJobTitle, "Inductor job title"),
    cscsCopyTaken: optionalBoolean(value.cscsCopyTaken, "CSCS copy taken"),
    aaCertificateCopyTaken: optionalBoolean(value.aaCertificateCopyTaken, "Asbestos Awareness copy taken"),
    ipafCopyTaken: optionalBoolean(value.ipafCopyTaken, "IPAF copy taken"),
    spaCopyTaken: optionalBoolean(value.spaCopyTaken, "SPA copy taken"),
    uploadedDocuments,
  };
}
