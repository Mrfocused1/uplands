import assert from "node:assert/strict";
import test from "node:test";
import { detectSections } from "../lib/rams/detectSections.ts";
import { normaliseText, snippetFor, tokenCount } from "../lib/rams/text.ts";
import { validateRamsStructuredAnswer } from "../lib/ai/validateRamsAnswer.ts";

test("normaliseText supports keyword matching", () => {
  assert.equal(normaliseText("IPAF / PASMA & PPE!"), "ipaf pasma ppe");
  assert.equal(tokenCount("CSCS cards must be shown at induction."), 7);
});

test("snippetFor centres snippets near the query term", () => {
  const text = "Manual handling controls are included. Operatives using MEWPs must hold IPAF. PPE is required.";
  assert.match(snippetFor(text, "IPAF", 60), /IPAF/);
});

test("detectSections identifies RAMS headings without an LLM", () => {
  const sections = detectSections([
    {
      pageNumber: 1,
      width: 595,
      height: 842,
      text: "METHOD STATEMENT\nGeneral work details",
      items: [],
    },
    {
      pageNumber: 2,
      width: 595,
      height: 842,
      text: "RISK ASSESSMENT\nHazards and controls",
      items: [],
    },
  ]);

  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "METHOD STATEMENT");
  assert.equal(sections[0].startPage, 1);
  assert.equal(sections[0].endPage, 1);
  assert.equal(sections[1].title, "RISK ASSESSMENT");
});

test("AI structured answer validation rejects fabricated citation IDs", () => {
  const answer = validateRamsStructuredAnswer(
    {
      answer: "The RAMS identifies IPAF evidence.",
      citations: ["chunk-a", "made-up"],
      confidence: "high",
    },
    new Set(["chunk-a"]),
    "test-model",
  );

  assert.deepEqual(answer.citations, ["chunk-a"]);
  assert.equal(answer.confidence, "high");
});

test("AI structured answer validation rejects empty answers", () => {
  assert.throws(
    () => validateRamsStructuredAnswer({ answer: "", citations: ["chunk-a"], confidence: "high" }, new Set(["chunk-a"]), "test-model"),
    /empty answer/,
  );
});
