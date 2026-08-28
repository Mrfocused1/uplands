import assert from "node:assert/strict";
import test from "node:test";
import { detectSections } from "../lib/rams/detectSections.ts";
import { disabledAiProvider } from "../lib/ai/disabled.ts";
import { ramsCopilotRetrievalQuery } from "../lib/rams/copilotRetrieval.ts";
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

test("RAMS Copilot summary prompts use a substantive retrieval query", () => {
  const query = ramsCopilotRetrievalQuery({ question: "give me a summary about this" });
  assert.match(query, /method statement/i);
  assert.match(query, /risk assessment/i);
  assert.match(query, /PPE/i);
  assert.doesNotMatch(query, /^give me a summary/i);
});

test("disabled AI provider returns a useful evidence-led summary fallback", async () => {
  const answer = await disabledAiProvider.answerRamsQuestion({
    question: "give me a summary about this",
    document: {
      id: "rams-1",
      title: "Flooring installation",
      contractor: "Ampthill Flooring Limited",
      siteName: "Newport - 81978",
      revision: null,
    },
    evidence: [
      {
        chunkId: "chunk-1",
        pageNumber: 4,
        endPageNumber: 4,
        sectionTitle: "METHOD STATEMENT",
        snippet: "Flooring installation method statement.",
        score: 1,
        text: "Flooring installation method statement.",
        boxes: [],
      },
    ],
  });

  assert.match(answer.answer, /Ampthill Flooring Limited RAMS covers Flooring installation/);
  assert.match(answer.answer, /METHOD STATEMENT/);
  assert.deepEqual(answer.citations, ["chunk-1"]);
});
