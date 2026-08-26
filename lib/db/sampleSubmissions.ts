import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";
import type { EvidenceType } from "@/types/evidence";

const SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

type SampleSubmission = {
  id: string;
  reference: string;
  printReviewStatus: "not_reviewed" | "ready";
  pinned: boolean;
  createdAt: string;
  data: UHSF1601PrintData;
};

const samples: SampleSubmission[] = [
  {
    id: "sample-uhsf1601-001",
    reference: "UHSF-SAMPLE-001",
    printReviewStatus: "ready",
    pinned: true,
    createdAt: "2026-08-26T08:20:00.000Z",
    data: sampleData({
      fullName: "Aisha Patel",
      contactNumber: "07700 900101",
      companyName: "Northline Electrical Ltd",
      occupation: "Electrician",
      cscsCardNumber: "CSCS-AP-481920",
      cscsExpiry: "2028-04-12",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: false,
      clientSpecificTraining: "M&S Academy",
      trainedFirstAider: true,
      trainedFireWarden: false,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-002",
    reference: "UHSF-SAMPLE-002",
    printReviewStatus: "not_reviewed",
    pinned: false,
    createdAt: "2026-08-26T08:35:00.000Z",
    data: sampleData({
      fullName: "Ben Morgan",
      contactNumber: "07700 900102",
      companyName: "Morgan Drylining",
      occupation: "Dryliner",
      cscsCardNumber: "CSCS-BM-382711",
      cscsExpiry: "2027-11-03",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: false,
      clientSpecificTraining: "Tesco Academy",
      trainedFirstAider: false,
      trainedFireWarden: false,
      supervisor: true,
      currentSmstsOrSssts: true,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-003",
    reference: "UHSF-SAMPLE-003",
    printReviewStatus: "not_reviewed",
    pinned: true,
    createdAt: "2026-08-26T08:50:00.000Z",
    data: sampleData({
      fullName: "Chloe Evans",
      contactNumber: "07700 900103",
      companyName: "Evans Mechanical Services",
      occupation: "Plumber",
      cscsCardNumber: "CSCS-CE-719244",
      cscsExpiry: "2029-01-18",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: true,
      cpcsNumber: "CPCS-CE-5532",
      cpcsExpiry: "2028-05-22",
      clientSpecificTraining: "Whole Foods contractor induction",
      trainedFirstAider: false,
      trainedFireWarden: true,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-004",
    reference: "UHSF-SAMPLE-004",
    printReviewStatus: "ready",
    pinned: false,
    createdAt: "2026-08-26T09:05:00.000Z",
    data: sampleData({
      fullName: "Daniel Hughes",
      contactNumber: "07700 900104",
      companyName: "Hughes Joinery",
      occupation: "Carpenter",
      cscsCardNumber: "CSCS-DH-928174",
      cscsExpiry: "2027-08-30",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: false,
      clientSpecificTraining: "Retail fit-out safety briefing",
      trainedFirstAider: true,
      trainedFireWarden: true,
      supervisor: true,
      currentSmstsOrSssts: true,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-005",
    reference: "UHSF-SAMPLE-005",
    printReviewStatus: "not_reviewed",
    pinned: false,
    createdAt: "2026-08-26T09:20:00.000Z",
    data: sampleData({
      fullName: "Elena Rossi",
      contactNumber: "07700 900105",
      companyName: "Rossi Decorating",
      occupation: "Painter and Decorator",
      cscsCardNumber: "CSCS-ER-102938",
      cscsExpiry: "2028-12-14",
      asbestosCertificatePresent: true,
      scaffolding: true,
      cisrsNumber: "CISRS-ER-8120",
      cisrsExpiry: "2027-10-01",
      operatingPlant: false,
      clientSpecificTraining: "M&S Academy",
      trainedFirstAider: false,
      trainedFireWarden: false,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-006",
    reference: "UHSF-SAMPLE-006",
    printReviewStatus: "ready",
    pinned: false,
    createdAt: "2026-08-26T09:35:00.000Z",
    data: sampleData({
      fullName: "Farah Ahmed",
      contactNumber: "07700 900106",
      companyName: "FA Fire Protection",
      occupation: "Fire Stopper",
      cscsCardNumber: "CSCS-FA-773901",
      cscsExpiry: "2029-03-09",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: false,
      clientSpecificTraining: "Tesco Academy",
      trainedFirstAider: false,
      trainedFireWarden: true,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-007",
    reference: "UHSF-SAMPLE-007",
    printReviewStatus: "not_reviewed",
    pinned: false,
    createdAt: "2026-08-26T09:50:00.000Z",
    data: sampleData({
      fullName: "George Williams",
      contactNumber: "07700 900107",
      companyName: "Williams Flooring",
      occupation: "Floor Layer",
      cscsCardNumber: "CSCS-GW-664120",
      cscsExpiry: "2028-06-21",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: true,
      cpcsNumber: "CPCS-GW-2194",
      cpcsExpiry: "2027-07-19",
      clientSpecificTraining: "Kings Road site induction",
      trainedFirstAider: false,
      trainedFireWarden: false,
      supervisor: true,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-008",
    reference: "UHSF-SAMPLE-008",
    printReviewStatus: "ready",
    pinned: true,
    createdAt: "2026-08-26T10:05:00.000Z",
    data: sampleData({
      fullName: "Hannah Clarke",
      contactNumber: "07700 900108",
      companyName: "Clarke Site Logistics",
      occupation: "Logistics Operative",
      cscsCardNumber: "CSCS-HC-908172",
      cscsExpiry: "2027-09-27",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: false,
      clientSpecificTraining: "Uplands site logistics briefing",
      trainedFirstAider: true,
      trainedFireWarden: false,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-009",
    reference: "UHSF-SAMPLE-009",
    printReviewStatus: "not_reviewed",
    pinned: false,
    createdAt: "2026-08-26T10:20:00.000Z",
    data: sampleData({
      fullName: "Ibrahim Khan",
      contactNumber: "07700 900109",
      companyName: "IK Groundworks",
      occupation: "Groundworker",
      cscsCardNumber: "CSCS-IK-341256",
      cscsExpiry: "2028-02-07",
      asbestosCertificatePresent: true,
      scaffolding: false,
      operatingPlant: true,
      cpcsNumber: "CPCS-IK-4827",
      cpcsExpiry: "2029-01-11",
      clientSpecificTraining: "Whole Foods contractor induction",
      trainedFirstAider: false,
      trainedFireWarden: false,
      supervisor: false,
      currentSmstsOrSssts: false,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
  {
    id: "sample-uhsf1601-010",
    reference: "UHSF-SAMPLE-010",
    printReviewStatus: "ready",
    pinned: false,
    createdAt: "2026-08-26T10:35:00.000Z",
    data: sampleData({
      fullName: "Jade Thompson",
      contactNumber: "07700 900110",
      companyName: "Thompson Ceilings",
      occupation: "Ceiling Fixer",
      cscsCardNumber: "CSCS-JT-550931",
      cscsExpiry: "2027-12-05",
      asbestosCertificatePresent: true,
      scaffolding: true,
      cisrsNumber: "CISRS-JT-1976",
      cisrsExpiry: "2028-08-15",
      operatingPlant: false,
      clientSpecificTraining: "Retail fit-out safety briefing",
      trainedFirstAider: true,
      trainedFireWarden: false,
      supervisor: true,
      currentSmstsOrSssts: true,
      ramsBriefed: true,
      declarationDate: "2026-08-26",
    }),
  },
];

function sampleData(overrides: Partial<UHSF1601PrintData>): UHSF1601PrintData {
  return {
    fullName: "",
    contactNumber: "",
    homeAddress: "42 Sample Street, London, SW1A 1AA",
    companyName: "",
    occupation: "",
    emergencyContactName: "Sam Contact",
    emergencyContactTelephone: "07700 901999",
    medicalInformation: "None declared",
    cscsCardNumber: "",
    cscsExpiry: "",
    asbestosCertificatePresent: true,
    scaffolding: false,
    cisrsNumber: null,
    cisrsExpiry: null,
    operatingPlant: false,
    cpcsNumber: null,
    cpcsExpiry: null,
    clientSpecificTraining: "",
    clientTrainingCompletionDate: "2026-08-01",
    clientTrainingExpiryDate: "2027-08-01",
    trainedFirstAider: false,
    trainedFireWarden: false,
    supervisor: false,
    currentSmstsOrSssts: false,
    ramsBriefed: true,
    confirmedRamsDeclaration: true,
    confirmedSiteRulesDeclaration: true,
    confirmedPpeDeclaration: true,
    inducteeSignature: SIGNATURE_PNG,
    declarationDate: "",
    siteName: null,
    hardHatPresent: null,
    highVisPresent: null,
    glovesPresent: null,
    bootsPresent: null,
    safetyEyewearPresent: null,
    rpePresent: null,
    inductorName: null,
    inductorDate: null,
    inductorSignature: null,
    inductorJobTitle: null,
    cscsCopyTaken: null,
    aaCertificateCopyTaken: null,
    ipafCopyTaken: null,
    spaCopyTaken: null,
    uploadedDocuments: [],
    ...overrides,
  };
}

function evidenceSvg(name: string, label: string, reference: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#ffffff"/>
  <rect x="48" y="48" width="1104" height="664" rx="18" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="4"/>
  <text x="90" y="150" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#18181b">${escapeXml(label)}</text>
  <text x="90" y="250" font-family="Arial, sans-serif" font-size="40" fill="#27272a">${escapeXml(name)}</text>
  <text x="90" y="330" font-family="Arial, sans-serif" font-size="34" fill="#52525b">${escapeXml(reference)}</text>
  <text x="90" y="610" font-family="Arial, sans-serif" font-size="28" fill="#71717a">Sample evidence document for admin review</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case "\"":
        return "&quot;";
      default:
        return char;
    }
  });
}

export function seedSampleSubmissions(db: Database.Database, uploadsDir: string) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE is_sample = 1").get() as { count: number };
  if (existing.count > 0) return;

  fs.mkdirSync(uploadsDir, { recursive: true });

  const insertSubmission = db.prepare(
    `INSERT OR IGNORE INTO submissions
       (id, reference, full_name, company_name, site_name, declaration_date, print_review_status, print_data, created_at, updated_at, pinned, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );

  const insertEvidence = db.prepare(
    `INSERT OR IGNORE INTO evidence_documents
       (id, submission_id, document_type, original_name, mime_type, storage_path, source_width, source_height, fit_mode, offset_x, offset_y, scale, rotation, updated_at, updated_by)
     VALUES (?, ?, ?, ?, 'image/svg+xml', ?, 1200, 760, 'fit', 0, 0, 1, 0, ?, NULL)`,
  );

  const run = db.transaction(() => {
    samples.forEach((sample) => {
      const dir = path.join(uploadsDir, sample.id);
      fs.mkdirSync(dir, { recursive: true });

      insertSubmission.run(
        sample.id,
        sample.reference,
        sample.data.fullName ?? null,
        sample.data.companyName ?? null,
        sample.data.siteName ?? null,
        sample.data.declarationDate ?? null,
        sample.printReviewStatus,
        JSON.stringify(sample.data),
        sample.createdAt,
        sample.createdAt,
        sample.pinned ? 1 : 0,
      );

      ([
        ["cscs", "CSCS Card"],
        ["asbestos", "Asbestos Awareness Certificate"],
        ["manualHandling", "Manual Handling Awareness Certificate"],
      ] as Array<[EvidenceType, string]>).forEach(([type, label]) => {
        const filePath = path.join(dir, `${type}.svg`);
        fs.writeFileSync(filePath, evidenceSvg(sample.data.fullName ?? "Sample inductee", label, sample.reference));
        insertEvidence.run(`${sample.id}-${type}`, sample.id, type, `${label}.svg`, filePath, sample.createdAt);
      });
    });
  });

  run();
}
