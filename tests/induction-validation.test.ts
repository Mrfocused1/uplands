import assert from "node:assert/strict";
import test from "node:test";
import { validateUHSF1601PrintData, ValidationError } from "../lib/induction/validatePrintData.ts";

const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test("validateUHSF1601PrintData rejects blank or malformed submissions", () => {
  assert.throws(() => validateUHSF1601PrintData(null), ValidationError);
  assert.throws(() => validateUHSF1601PrintData({}), /Full name is required/);
  assert.throws(
    () =>
      validateUHSF1601PrintData({
        fullName: "Alex Smith",
        contactNumber: "07700 900000",
        companyName: "Example Ltd",
        confirmedRamsDeclaration: true,
        confirmedSiteRulesDeclaration: true,
        confirmedPpeDeclaration: true,
        declarationDate: "2026-08-28",
      }),
    /Inductee signature is required/,
  );
});

test("validateUHSF1601PrintData accepts a minimal completed induction", () => {
  const data = validateUHSF1601PrintData({
    fullName: "Alex Smith",
    contactNumber: "07700 900000",
    companyName: "Example Ltd",
    confirmedRamsDeclaration: true,
    confirmedSiteRulesDeclaration: true,
    confirmedPpeDeclaration: true,
    inducteeSignature: signature,
    declarationDate: "2026-08-28",
  });

  assert.equal(data.fullName, "Alex Smith");
  assert.equal(data.companyName, "Example Ltd");
  assert.deepEqual(data.uploadedDocuments, []);
});

test("validateUHSF1601PrintData rejects invalid uploaded evidence data", () => {
  assert.throws(
    () =>
      validateUHSF1601PrintData({
        fullName: "Alex Smith",
        contactNumber: "07700 900000",
        companyName: "Example Ltd",
        confirmedRamsDeclaration: true,
        confirmedSiteRulesDeclaration: true,
        confirmedPpeDeclaration: true,
        inducteeSignature: signature,
        declarationDate: "2026-08-28",
        uploadedDocuments: [{ id: "cscs", label: "CSCS", dataUrl: "data:text/html;base64,PGgxPk5vPC9oMT4=" }],
      }),
    /must be an image upload/,
  );
});
