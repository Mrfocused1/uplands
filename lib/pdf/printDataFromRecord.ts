import type { FieldAnswer, InductionRecord, InductionValue } from "@/types/induction";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

function printableValue(answer?: FieldAnswer): InductionValue {
  if (!answer || answer.skipped || answer.notApplicable) return null;
  return answer.value;
}

function text(answer?: FieldAnswer) {
  const value = printableValue(answer);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function yesNo(answer?: FieldAnswer) {
  const value = printableValue(answer);
  if (value === "Yes" || value === true) return true;
  if (value === "No" || value === false) return false;
  return null;
}

function present(answer?: FieldAnswer) {
  const value = printableValue(answer);
  if (value === "Present") return true;
  if (value === "Not present") return false;
  return null;
}

function copyTaken(answer?: FieldAnswer) {
  const value = printableValue(answer);
  if (value === "Copy taken") return true;
  if (value === "Not taken") return false;
  return null;
}

function confirmed(answer?: FieldAnswer) {
  const value = printableValue(answer);
  return typeof value === "boolean" ? value : null;
}

function signature(answer?: FieldAnswer) {
  const value = printableValue(answer);
  return typeof value === "string" && value.startsWith("data:image/png;base64,") ? value : null;
}

function medicalInformation(answer?: FieldAnswer) {
  const value = text(answer);
  return value && value !== "No" ? value : null;
}

export function printDataFromRecord(record: InductionRecord): UHSF1601PrintData {
  const answers = record.answers;

  return {
    fullName: text(answers.fullName),
    contactNumber: text(answers.contactNumber),
    homeAddress: text(answers.homeAddress),
    companyName: text(answers.companyName),
    occupation: text(answers.occupation),
    emergencyContactName: text(answers.emergencyContactName),
    emergencyContactTelephone: text(answers.emergencyContactTelephone),
    medicalInformation: medicalInformation(answers.medicalInformation),
    cscsCardNumber: text(answers.cscsCardNumber),
    cscsExpiry: text(answers.cscsExpiry),
    asbestosCertificatePresent: yesNo(answers.asbestosAwarenessCertificate),
    scaffolding: yesNo(answers.erectScaffolding),
    cisrsNumber: text(answers.cisrsNumber),
    cisrsExpiry: text(answers.cisrsExpiryDate),
    operatingPlant: yesNo(answers.operatePlant),
    cpcsNumber: text(answers.cpcsNumber),
    cpcsExpiry: text(answers.cpcsExpiryDate),
    clientSpecificTraining: text(answers.clientSpecificTraining),
    clientTrainingCompletionDate: text(answers.clientTrainingCompletionDate),
    clientTrainingExpiryDate: text(answers.clientTrainingExpiryDate),
    trainedFirstAider: yesNo(answers.trainedFirstAider),
    trainedFireWarden: yesNo(answers.trainedFireWarden),
    supervisor: yesNo(answers.supervisor),
    currentSmstsOrSssts: yesNo(answers.smstsSssts),
    ramsBriefed: yesNo(answers.ramsBriefing),
    confirmedRamsDeclaration: confirmed(answers.ramsDeclaration),
    confirmedSiteRulesDeclaration: confirmed(answers.siteRulesDeclaration),
    confirmedPpeDeclaration: confirmed(answers.ppeDeclaration),
    inducteeSignature: signature(answers.inducteeSignature),
    declarationDate: text(answers.declarationDate),
    siteName: text(answers.siteName),
    hardHatPresent: present(answers.ppeHardHat),
    highVisPresent: present(answers.ppeHighVisibilityVest),
    glovesPresent: present(answers.ppeGloves),
    bootsPresent: present(answers.ppeBoots),
    safetyEyewearPresent: present(answers.ppeSafetyEyewear),
    rpePresent: present(answers.ppeRpe),
    inductorName: text(answers.inductorName),
    inductorDate: text(answers.inductionDate),
    inductorSignature: signature(answers.inductorSignature),
    inductorJobTitle: text(answers.inductorJobTitle),
    cscsCopyTaken: copyTaken(answers.cscsCopy),
    aaCertificateCopyTaken: copyTaken(answers.aaCertCopy),
    ipafCopyTaken: copyTaken(answers.ipafCopy),
    spaCopyTaken: copyTaken(answers.spaCopy),
  };
}
