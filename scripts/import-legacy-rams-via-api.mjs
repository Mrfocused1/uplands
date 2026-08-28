#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "config", "ramsReviews.json");
const privateRamsDir = path.join(root, "private", "rams");
const baseUrl = process.argv.find((arg) => arg.startsWith("--base-url="))?.slice("--base-url=".length) || "http://127.0.0.1:8747";

function readLegacyForms() {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw).forms ?? [];
}

function sourcePdfFor(form) {
  return (form.documents ?? []).find((document) => document.type === "pdf" && /source rams/i.test(document.title ?? ""));
}

function privatePathFromHref(href) {
  const cleanHref = decodeURIComponent(String(href ?? "").replace(/^\/api\/admin\/legacy-rams\/?/, ""));
  return path.join(privateRamsDir, cleanHref);
}

async function existingDocumentReferences() {
  const response = await fetch(`${baseUrl}/api/admin/rams`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to list RAMS documents from ${baseUrl}: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return new Set((payload.documents ?? []).map((document) => document.documentReference).filter(Boolean));
}

async function importForm(form) {
  const source = sourcePdfFor(form);
  if (!source) return { status: "skipped", reason: "No source PDF", form };

  const filePath = privatePathFromHref(source.href);
  if (!fs.existsSync(filePath)) return { status: "skipped", reason: `Missing file ${source.href}`, form };

  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const data = new FormData();
  data.set("title", form.title || `${form.company} RAMS`);
  data.set("siteName", form.site || "");
  data.set("contractor", form.company || "Unknown contractor");
  data.set("documentReference", `legacy:${form.id}`);
  data.set("revision", form.revision || "");
  data.set("revisionDate", form.revisionDate || "");
  data.set("file", new Blob([buffer], { type: "application/pdf" }), fileName);

  const response = await fetch(`${baseUrl}/api/admin/rams`, { method: "POST", body: data });
  const body = await response.text();
  if (!response.ok) throw new Error(`Import failed for ${form.company}: ${response.status} ${body}`);
  return { status: "imported", form, response: body ? JSON.parse(body) : null };
}

async function main() {
  const forms = readLegacyForms();
  const existing = await existingDocumentReferences();
  const results = [];

  for (const form of forms) {
    const reference = `legacy:${form.id}`;
    if (existing.has(reference)) {
      results.push({ status: "exists", form });
      continue;
    }

    const result = await importForm(form);
    if (result.status === "imported") existing.add(reference);
    results.push(result);
  }

  for (const result of results) {
    const company = result.form?.company ?? "Unknown";
    const title = result.form?.title ?? "";
    if (result.status === "imported") {
      const processing = result.response?.processing;
      console.log(`imported ${company} - ${title} (${processing?.status ?? "UNKNOWN"}, ${processing?.chunkCount ?? 0} chunks)`);
    } else if (result.status === "exists") {
      console.log(`exists   ${company} - ${title}`);
    } else {
      console.log(`skipped  ${company} - ${title}: ${result.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
