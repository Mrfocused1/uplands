import assert from "node:assert/strict";
import test from "node:test";
import { getOcrProvider } from "../lib/ocr/provider.ts";

test("OCR provider defaults to disabled", () => {
  const previous = process.env.OCR_PROVIDER;
  delete process.env.OCR_PROVIDER;
  try {
    assert.equal(getOcrProvider().name, "disabled");
  } finally {
    if (previous === undefined) delete process.env.OCR_PROVIDER;
    else process.env.OCR_PROVIDER = previous;
  }
});

test("OCR provider can be configured to tesseract", () => {
  const previous = process.env.OCR_PROVIDER;
  process.env.OCR_PROVIDER = "tesseract";
  try {
    assert.equal(getOcrProvider().name, "tesseract");
    assert.equal(getOcrProvider().isAvailable(), true);
  } finally {
    if (previous === undefined) delete process.env.OCR_PROVIDER;
    else process.env.OCR_PROVIDER = previous;
  }
});
