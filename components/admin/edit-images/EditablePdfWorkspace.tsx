/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/Spinner";
import { editableImageDocuments, type EditableImageDocument, type EditablePdfField } from "@/config/editImages";

type FieldValues = Record<string, string>;
type ViewMode = "preview" | "edit";
type PdfLoadState = "idle" | "loading" | "loaded" | "error";

function initialValuesFor(document: EditableImageDocument): FieldValues {
  return Object.fromEntries(document.fields.map((field) => [field.id, field.initialValue]));
}

function fieldsForPage(document: EditableImageDocument, pageNumber: number) {
  return document.fields.filter((field) => field.pageNumber === pageNumber);
}

function inputStyle(field: EditablePdfField, pageWidth: number, pageHeight: number) {
  return {
    left: `${(field.rect.x / pageWidth) * 100}%`,
    top: `${(field.rect.y / pageHeight) * 100}%`,
    width: `${(field.rect.width / pageWidth) * 100}%`,
    height: `${(field.rect.height / pageHeight) * 100}%`,
    textAlign: field.align,
    fontSize: `${field.fontSize * 1.35}px`,
    lineHeight: field.multiline ? "1.18" : "1.1",
  } as const;
}

export function EditablePdfWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const selectedDocument = useMemo(
    () => editableImageDocuments.find((document) => document.slug === selectedSlug) ?? null,
    [selectedSlug],
  );
  const [valuesByDocument, setValuesByDocument] = useState<Record<string, FieldValues>>(() =>
    Object.fromEntries(editableImageDocuments.map((document) => [document.slug, initialValuesFor(document)])),
  );
  const [downloadState, setDownloadState] = useState<"idle" | "busy" | "error">("idle");
  const [pdfLoadState, setPdfLoadState] = useState<PdfLoadState>("idle");

  const values = selectedDocument ? valuesByDocument[selectedDocument.slug] ?? initialValuesFor(selectedDocument) : {};

  useEffect(() => {
    if (selectedDocument && viewMode === "preview") setPdfLoadState("loading");
  }, [selectedDocument, viewMode]);

  function selectDocument(document: EditableImageDocument) {
    setSelectedSlug(document.slug);
    setViewMode("preview");
    setPdfLoadState("loading");
  }

  function updateField(document: EditableImageDocument, fieldId: string, value: string) {
    setValuesByDocument((current) => ({
      ...current,
      [document.slug]: {
        ...(current[document.slug] ?? initialValuesFor(document)),
        [fieldId]: value,
      },
    }));
  }

  function printEditedPages() {
    if (viewMode === "edit") {
      window.print();
      return;
    }

    setViewMode("edit");
    window.setTimeout(() => window.print(), 80);
  }

  async function downloadEditedPdf(document: EditableImageDocument) {
    setDownloadState("busy");
    try {
      const response = await fetch(document.downloadHref, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: values }),
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.editedFileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <div className="edit-images-page space-y-8">
      <section className="no-print border border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Admin</p>
            <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">Edit Images</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-uplands-muted">
              Open PDF documents, edit live text on selected pages, print the edited pages, and download a finished PDF copy.
            </p>
          </div>
        </div>
      </section>

      {!selectedDocument && (
        <section className="edit-image-list no-print border border-zinc-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-slab text-2xl text-uplands-charcoal">Documents</h2>
              <p className="mt-1 text-sm text-uplands-muted">Select a document to open the PDF viewer.</p>
            </div>
            <span className="text-xs font-bold uppercase text-uplands-muted">{editableImageDocuments.length} document</span>
          </div>
          <div className="divide-y divide-zinc-200 border border-zinc-200">
            {editableImageDocuments.map((document) => (
              <button
                key={document.slug}
                type="button"
                onClick={() => selectDocument(document)}
                className="grid w-full gap-3 bg-white px-4 py-4 text-left transition hover:bg-uplands-paper sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <span className="block font-din text-lg text-uplands-charcoal">{document.title}</span>
                  <span className="mt-1 block text-sm text-uplands-muted">{document.description}</span>
                </span>
                <span className="px-2.5 py-1 text-xs font-bold uppercase text-uplands-magenta ring-1 ring-uplands-magenta">Open</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedDocument && (
        <>
          <section className="no-print border border-zinc-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Selected Document</p>
                <h2 className="mt-1 font-slab text-2xl text-uplands-charcoal">{selectedDocument.title}</h2>
                <p className="mt-1 text-sm text-uplands-muted">{selectedDocument.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`min-h-10 border px-4 text-sm font-bold uppercase transition ${
                    viewMode === "preview"
                      ? "border-uplands-charcoal bg-uplands-charcoal text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
                  }`}
                >
                  View PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`min-h-10 border px-4 text-sm font-bold uppercase transition ${
                    viewMode === "edit"
                      ? "border-uplands-charcoal bg-uplands-charcoal text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
                  }`}
                >
                  Edit Pages 3-5
                </button>
                <button
                  type="button"
                  onClick={printEditedPages}
                  className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta"
                >
                  Print Edited Pages
                </button>
                <button
                  type="button"
                  onClick={() => downloadEditedPdf(selectedDocument)}
                  disabled={downloadState === "busy"}
                  className="min-h-10 border border-uplands-magenta bg-uplands-magenta px-4 text-sm font-bold uppercase text-white transition hover:bg-[#8e0075] disabled:cursor-wait disabled:opacity-70"
                >
                  {downloadState === "busy" ? "Preparing" : "Download Finished PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlug(null);
                    setDownloadState("idle");
                  }}
                  className="min-h-10 border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 transition hover:border-uplands-magenta hover:text-uplands-magenta"
                >
                  Close
                </button>
              </div>
            </div>
            {downloadState === "error" && <p className="mt-4 text-sm font-bold text-red-700">The finished PDF could not be created. Try again.</p>}
          </section>

          {viewMode === "preview" && (
            <section className="edit-image-preview no-print relative min-h-[70vh] overflow-hidden border border-zinc-200 bg-white shadow-soft">
              {pdfLoadState !== "loaded" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                  <div className="mx-auto max-w-sm px-6 text-center">
                    {pdfLoadState === "error" ? (
                      <>
                        <p className="font-din text-lg text-red-700">Unable to load PDF</p>
                        <p className="mt-2 text-sm leading-6 text-uplands-muted">Close this document and try opening it again.</p>
                      </>
                    ) : (
                      <>
                        <Spinner className="mx-auto h-8 w-8 text-uplands-magenta" />
                        <p className="mt-4 font-din text-lg text-uplands-charcoal">Loading PDF</p>
                        <p className="mt-2 text-sm leading-6 text-uplands-muted">Preparing the editable document preview.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <iframe
                key={selectedDocument.sourceHref}
                src={selectedDocument.sourceHref}
                title={selectedDocument.title}
                onLoad={() => setPdfLoadState("loaded")}
                onError={() => setPdfLoadState("error")}
                className={`h-[78vh] w-full bg-white transition-opacity duration-200 ${pdfLoadState === "loaded" ? "opacity-100" : "opacity-0"}`}
              />
            </section>
          )}

          {viewMode === "edit" && (
            <section className="edit-image-editor space-y-6">
              {selectedDocument.pages.map((page) => (
                <article key={page.pageNumber} className="print-page">
                  <div className="no-print mb-2 flex items-center justify-between gap-4">
                    <h2 className="font-slab text-xl text-uplands-charcoal">{page.title}</h2>
                    <span className="text-xs font-bold uppercase text-uplands-muted">Editable text boxes</span>
                  </div>
                  <div className="relative mx-auto aspect-[4/3] w-full max-w-[1080px] overflow-hidden border border-zinc-300 bg-white shadow-soft print:border-0 print:shadow-none">
                    <img src={page.imageSrc} alt={page.title} className="absolute inset-0 h-full w-full object-contain" />
                    {fieldsForPage(selectedDocument, page.pageNumber).map((field) => (
                      <textarea
                        key={field.id}
                        aria-label={field.label}
                        value={values[field.id] ?? ""}
                        onChange={(event) => updateField(selectedDocument, field.id, event.target.value)}
                        rows={field.multiline ? 2 : 1}
                        spellCheck={false}
                        className="absolute resize-none overflow-hidden border border-uplands-magenta/50 bg-[#bfbfbf] px-1.5 py-1 font-sans text-black outline-none transition focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/30 print:border-0 print:ring-0"
                        style={inputStyle(field, page.width, page.height)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
