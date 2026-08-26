export interface UploadedDocument {
  label: string;
  dataUrl: string;
}

export interface UHSF1601PrintData {
  fullName?: string | null;
  contactNumber?: string | null;
  homeAddress?: string | null;
  companyName?: string | null;
  occupation?: string | null;
  emergencyContactName?: string | null;
  emergencyContactTelephone?: string | null;
  medicalInformation?: string | null;
  cscsCardNumber?: string | null;
  cscsExpiry?: string | null;
  asbestosCertificatePresent?: boolean | null;
  scaffolding?: boolean | null;
  cisrsNumber?: string | null;
  cisrsExpiry?: string | null;
  operatingPlant?: boolean | null;
  cpcsNumber?: string | null;
  cpcsExpiry?: string | null;
  clientSpecificTraining?: string | null;
  clientTrainingCompletionDate?: string | null;
  clientTrainingExpiryDate?: string | null;
  trainedFirstAider?: boolean | null;
  trainedFireWarden?: boolean | null;
  supervisor?: boolean | null;
  currentSmstsOrSssts?: boolean | null;
  ramsBriefed?: boolean | null;
  confirmedRamsDeclaration?: boolean | null;
  confirmedSiteRulesDeclaration?: boolean | null;
  confirmedPpeDeclaration?: boolean | null;
  inducteeSignature?: string | null;
  declarationDate?: string | null;
  siteName?: string | null;
  hardHatPresent?: boolean | null;
  highVisPresent?: boolean | null;
  glovesPresent?: boolean | null;
  bootsPresent?: boolean | null;
  safetyEyewearPresent?: boolean | null;
  rpePresent?: boolean | null;
  inductorName?: string | null;
  inductorDate?: string | null;
  inductorSignature?: string | null;
  inductorJobTitle?: string | null;
  cscsCopyTaken?: boolean | null;
  aaCertificateCopyTaken?: boolean | null;
  ipafCopyTaken?: boolean | null;
  spaCopyTaken?: boolean | null;
  uploadedDocuments?: UploadedDocument[];
}
