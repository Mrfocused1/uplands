import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

export interface FormDisplayRow {
  label: string;
  text?: string;
  imageDataUrl?: string;
}

export interface FormDisplaySection {
  title: string;
  rows: FormDisplayRow[];
}

function text(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "—";
}

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function present(value: boolean | null | undefined): string {
  if (value === true) return "Present";
  if (value === false) return "Not present";
  return "—";
}

function copyTaken(value: boolean | null | undefined): string {
  if (value === true) return "Copy taken";
  if (value === false) return "Not taken";
  return "—";
}

function signature(value: string | null | undefined): Pick<FormDisplayRow, "text" | "imageDataUrl"> {
  if (value && value.startsWith("data:image/")) {
    return { imageDataUrl: value };
  }
  return { text: "Not signed" };
}

function section(title: string, rows: FormDisplayRow[]): FormDisplaySection {
  return { title, rows: rows.filter((row) => row.text !== undefined || row.imageDataUrl !== undefined) };
}

export function formatFormDisplay(data: UHSF1601PrintData): FormDisplaySection[] {
  const inducteeSignature = signature(data.inducteeSignature);
  const inductorSignature = signature(data.inductorSignature);

  return [
    section("Inductee — Personal Details", [
      { label: "Full name", text: text(data.fullName) },
      { label: "Contact number", text: text(data.contactNumber) },
      { label: "Home address", text: text(data.homeAddress) },
      { label: "Company name", text: text(data.companyName) },
      { label: "Occupation", text: text(data.occupation) },
      { label: "Emergency contact", text: text(data.emergencyContactName) },
      { label: "Emergency contact telephone", text: text(data.emergencyContactTelephone) },
      { label: "Medical information", text: data.medicalInformation ? data.medicalInformation : "None provided" },
    ]),
    section("Competence & Training", [
      { label: "CSCS card number", text: text(data.cscsCardNumber) },
      { label: "CSCS expiry", text: text(data.cscsExpiry) },
      { label: "Asbestos Awareness certificate", text: yesNo(data.asbestosCertificatePresent) },
      { label: "Erecting scaffolding", text: yesNo(data.scaffolding) },
      { label: "CISRS number", text: text(data.cisrsNumber) },
      { label: "CISRS expiry", text: text(data.cisrsExpiry) },
      { label: "Operating plant", text: yesNo(data.operatingPlant) },
      { label: "CPCS number", text: text(data.cpcsNumber) },
      { label: "CPCS expiry", text: text(data.cpcsExpiry) },
      { label: "Client specific training", text: text(data.clientSpecificTraining) },
      { label: "Client training completion date", text: text(data.clientTrainingCompletionDate) },
      { label: "Client training expiry", text: text(data.clientTrainingExpiryDate) },
      { label: "Trained First Aider", text: yesNo(data.trainedFirstAider) },
      { label: "Trained Fire Warden", text: yesNo(data.trainedFireWarden) },
      { label: "Supervisor", text: yesNo(data.supervisor) },
      { label: "Current SMSTS / SSSTS", text: yesNo(data.currentSmstsOrSssts) },
      { label: "IPAF", text: yesNo(data.ipaf) },
      { label: "PASMA", text: yesNo(data.pasma) },
      { label: "RAMS briefed", text: yesNo(data.ramsBriefed) },
    ]),
    section("Safe Working Declaration", [
      { label: "RAMS declaration", text: yesNo(data.confirmedRamsDeclaration) },
      { label: "Site rules declaration", text: yesNo(data.confirmedSiteRulesDeclaration) },
      { label: "PPE declaration", text: yesNo(data.confirmedPpeDeclaration) },
      { label: "Inductee signature", ...inducteeSignature },
      { label: "Declaration date", text: text(data.declarationDate) },
    ]),
    section("Acknowledgement — Uplands Inductor", [
      { label: "Site name", text: text(data.siteName) },
      { label: "Hard hat", text: present(data.hardHatPresent) },
      { label: "High visibility vest", text: present(data.highVisPresent) },
      { label: "Gloves", text: present(data.glovesPresent) },
      { label: "Boots", text: present(data.bootsPresent) },
      { label: "Safety eyewear", text: present(data.safetyEyewearPresent) },
      { label: "RPE", text: present(data.rpePresent) },
      { label: "Inductor name", text: text(data.inductorName) },
      { label: "Induction date", text: text(data.inductorDate) },
      { label: "Inductor signature", ...inductorSignature },
      { label: "Inductor job title", text: text(data.inductorJobTitle) },
    ]),
    section("Copies Taken", [
      { label: "CSCS", text: copyTaken(data.cscsCopyTaken) },
      { label: "Asbestos Awareness certificate", text: copyTaken(data.aaCertificateCopyTaken) },
      { label: "IPAF", text: copyTaken(data.ipafCopyTaken) },
      { label: "SPA", text: copyTaken(data.spaCopyTaken) },
    ]),
  ];
}
