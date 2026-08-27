"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import {
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  computeRenderedLayout,
  fillScaleMultiplier,
  frameRectInPoints,
} from "@/lib/evidence/transform";
import {
  defaultEvidenceTransform,
  EVIDENCE_TYPES,
  type EditableEvidenceType,
  type EvidencePrintTransform,
  type EvidenceType,
} from "@/types/evidence";

const DISPLAY_SCALE = 0.9;
const MIN_SCALE = 0.05;
const MAX_SCALE = 10;

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  cscs: "CSCS Card",
  asbestos: "Asbestos Awareness Certificate",
  manualHandling: "Manual Handling Awareness Certificate",
  firstAid: "First Aid Certificate",
  smstsSssts: "SMSTS / SSSTS Certificate",
  ipaf: "IPAF Certificate",
  pasma: "PASMA Certificate",
};

interface EvidenceItem {
  id: string;
  type: EvidenceType;
  originalName: string | null;
  mimeType: string | null;
  hasOriginal: boolean;
  printTransform: EvidencePrintTransform;
}

interface SubmissionData {
  id: string;
  fullName: string | null;
  reference: string | null;
  printReviewStatus: string;
  evidence: EvidenceItem[];
}

function isEditableEvidenceType(type: EvidenceType): type is EditableEvidenceType {
  return (EVIDENCE_TYPES as readonly string[]).includes(type);
}

function browserFrame(type: EditableEvidenceType) {
  const frame = frameRectInPoints(type);
  return {
    left: frame.x * DISPLAY_SCALE,
    top: (A4_HEIGHT_PT - frame.y - frame.height) * DISPLAY_SCALE,
    width: frame.width * DISPLAY_SCALE,
    height: frame.height * DISPLAY_SCALE,
  };
}

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export function EvidenceEditor({ id }: { id: string }) {
  const router = useRouter();

  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [transforms, setTransforms] = useState<Record<EditableEvidenceType, EvidencePrintTransform>>(() => ({
    cscs: defaultEvidenceTransform(),
    asbestos: defaultEvidenceTransform(),
    manualHandling: defaultEvidenceTransform(),
  }));
  const [natural, setNatural] = useState<Record<EditableEvidenceType, { width: number; height: number } | null>>({
    cscs: null,
    asbestos: null,
    manualHandling: null,
  });
  const [activeType, setActiveType] = useState<EditableEvidenceType | null>(null);
  const [past, setPast] = useState<EvidencePrintTransform[]>([]);
  const [future, setFuture] = useState<EvidencePrintTransform[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const dragRef = useRef<{
    type: EditableEvidenceType;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    frameWidth: number;
    frameHeight: number;
  } | null>(null);

  // Initialise the working transforms from the fetched submission.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/admin/submissions/${id}`);
        if (!response.ok) throw new Error("not found");
        const body = await response.json();
        if (cancelled) return;
        const submissionData = body.submission as SubmissionData;

        setSubmission(submissionData);
        const next: Record<EditableEvidenceType, EvidencePrintTransform> = {
          cscs: defaultEvidenceTransform(),
          asbestos: defaultEvidenceTransform(),
          manualHandling: defaultEvidenceTransform(),
        };
        for (const doc of submissionData.evidence) {
          if (!isEditableEvidenceType(doc.type)) continue;
          next[doc.type] = doc.printTransform;
        }
        setTransforms(next);

        // Preselect from the ?type= query param, else the first available document.
        const query = new URLSearchParams(window.location.search).get("type") as EvidenceType | null;
        const available = submissionData.evidence.flatMap((doc) => (doc.hasOriginal && isEditableEvidenceType(doc.type) ? [doc.type] : []));
        if (query && isEditableEvidenceType(query)) setActiveType(query);
        else setActiveType(available[0] ?? null);
      } catch {
        if (!cancelled) setError("Unable to load this submission.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function pushHistory(type: EditableEvidenceType) {
    setPast((previous) => [...previous.slice(-49), transforms[type]]);
    setFuture([]);
  }

  function applyTransform(type: EditableEvidenceType, patch: Partial<EvidencePrintTransform>) {
    setTransforms((previous) => ({ ...previous, [type]: { ...previous[type], ...patch } }));
  }

  function beginDrag(type: EditableEvidenceType, event: React.PointerEvent<HTMLDivElement>) {
    const frame = browserFrame(type);
    setActiveType(type);
    pushHistory(type);
    dragRef.current = {
      type,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: transforms[type].offsetX,
      startOffsetY: transforms[type].offsetY,
      frameWidth: frame.width,
      frameHeight: frame.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startClientX) / drag.frameWidth;
    const dy = (event.clientY - drag.startClientY) / drag.frameHeight;
    applyTransform(drag.type, {
      offsetX: drag.startOffsetX + dx,
      offsetY: drag.startOffsetY + dy,
      fitMode: "custom",
    });
  }

  function endDrag() {
    dragRef.current = null;
  }

  function rotateClockwise() {
    if (!activeType) return;
    pushHistory(activeType);
    applyTransform(activeType, { rotation: ((transforms[activeType].rotation + 90) % 360) as EvidencePrintTransform["rotation"], fitMode: "custom" });
  }

  function rotateCounterClockwise() {
    if (!activeType) return;
    pushHistory(activeType);
    applyTransform(activeType, { rotation: ((transforms[activeType].rotation + 270) % 360) as EvidencePrintTransform["rotation"], fitMode: "custom" });
  }

  function setScale(nextScale: number, recordHistory = true) {
    if (!activeType) return;
    if (recordHistory) pushHistory(activeType);
    applyTransform(activeType, { scale: clampScale(nextScale), fitMode: "custom" });
  }

  function applyFit() {
    if (!activeType) return;
    pushHistory(activeType);
    applyTransform(activeType, { fitMode: "fit", scale: 1, offsetX: 0, offsetY: 0 });
  }

  function applyFill() {
    if (!activeType) return;
    const source = natural[activeType];
    if (!source) return;
    const frame = frameRectInPoints(activeType);
    const multiplier = fillScaleMultiplier(source.width, source.height, frame.width, frame.height, transforms[activeType].rotation);
    pushHistory(activeType);
    applyTransform(activeType, { fitMode: "fill", scale: clampScale(multiplier), offsetX: 0, offsetY: 0 });
  }

  function reset() {
    if (!activeType) return;
    pushHistory(activeType);
    applyTransform(activeType, defaultEvidenceTransform());
  }

  function undo() {
    if (!activeType || past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture((f) => [transforms[activeType], ...f]);
    setPast((p) => p.slice(0, -1));
    applyTransform(activeType, previous);
  }

  function redo() {
    if (!activeType || future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, transforms[activeType]]);
    setFuture((f) => f.slice(1));
    applyTransform(activeType, next);
  }

  async function saveTransforms() {
    const response = await fetch(`/api/admin/submissions/${id}/evidence`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transforms }),
    });
    return response.ok;
  }

  async function saveLayout() {
    setSaving(true);
    const ok = await saveTransforms();
    setSaving(false);
    setToast(ok ? "Layout saved" : "Save failed");
  }

  async function saveAndPreview() {
    setPreviewing(true);
    const ok = await saveTransforms();
    setPreviewing(false);
    if (ok) {
      setToast("Saved — opening PDF");
      window.open(`/api/admin/submissions/${id}/pdf`, "_blank", "noopener,noreferrer");
    } else {
      setToast("Save failed");
    }
  }

  async function saveAndMarkReady() {
    setSaving(true);
    const saved = await saveTransforms();
    const marked = saved ? (await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printReviewStatus: "ready" }),
    })).ok : false;
    setSaving(false);
    if (saved && marked) {
      router.push(`/admin/submissions/${id}`);
    } else {
      setToast("Unable to mark ready");
    }
  }

  if (error) {
    return <div className="border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-soft">{error}</div>;
  }

  if (!submission) {
    return <div className="py-16 text-center text-zinc-500">Loading editor…</div>;
  }

  const activeTransform = activeType ? transforms[activeType] : null;
  const activeNatural = activeType ? natural[activeType] : null;

  return (
    <div>
      <Link href={`/admin/submissions/${id}`} className="text-sm font-bold uppercase tracking-wide text-zinc-600 hover:text-uplands-magenta">
        Back to submission
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-5 border-b border-zinc-200 bg-white px-6 py-6 shadow-soft">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-uplands-magenta">Print evidence</p>
          <h1 className="mt-2 font-slab text-3xl leading-tight text-uplands-charcoal sm:text-4xl">Evidence editor</h1>
          <p className="mt-2 text-sm text-uplands-muted">{submission.fullName || "Unknown inductee"} · {submission.reference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={saveLayout} disabled={saving} className="border border-zinc-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-60">
            Save layout
          </button>
          <button onClick={saveAndPreview} disabled={saving || previewing} className="inline-flex items-center gap-2 bg-uplands-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#8e0075] disabled:opacity-60">
            {previewing && <Spinner />}
            {previewing ? "Preparing..." : "Save & preview PDF"}
          </button>
          <button onClick={saveAndMarkReady} disabled={saving} className="bg-emerald-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-emerald-500 disabled:opacity-60">
            Save &amp; mark ready
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto border border-zinc-200 bg-white p-4 shadow-soft">
          <div
            className="relative mx-auto bg-white shadow-md"
            style={{ width: A4_WIDTH_PT * DISPLAY_SCALE, height: A4_HEIGHT_PT * DISPLAY_SCALE }}
          >
            {EVIDENCE_TYPES.map((type) => {
              const frame = browserFrame(type);
              const doc = submission.evidence.find((item) => item.type === type);
              const transform = transforms[type];
              const source = natural[type];
              const isActive = activeType === type;

              let imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };
              if (source) {
                const framePt = frameRectInPoints(type);
                const layout = computeRenderedLayout(source.width, source.height, framePt.width, framePt.height, transform);
                imgStyle = {
                  position: "absolute",
                  left: (layout.left + layout.renderedWidth / 2) * DISPLAY_SCALE,
                  top: (layout.top + layout.renderedHeight / 2) * DISPLAY_SCALE,
                  width: source.width * layout.effectiveScale * DISPLAY_SCALE,
                  height: source.height * layout.effectiveScale * DISPLAY_SCALE,
                  transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
                  transformOrigin: "center",
                  objectFit: "fill",
                };
              }

              return (
                <div
                  key={type}
                  onPointerDown={(event) => doc?.hasOriginal && beginDrag(type, event)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={`absolute flex cursor-move items-center justify-center overflow-hidden ${
                    isActive ? "ring-2 ring-blue-500" : ""
                  }`}
                  style={{
                    left: frame.left,
                    top: frame.top,
                    width: frame.width,
                    height: frame.height,
                    border: "1px dashed rgba(0,0,0,0.35)",
                    touchAction: "none",
                  }}
                >
                  {doc?.hasOriginal ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/admin/submissions/${id}/preview/${type}`}
                      alt={EVIDENCE_LABELS[type]}
                      draggable={false}
                      style={imgStyle}
                      onLoad={(event) => {
                        const width = event.currentTarget.naturalWidth;
                        const height = event.currentTarget.naturalHeight;
                        if (width > 0 && height > 0) {
                          setNatural((previous) => (previous[type]?.width === width ? previous : { ...previous, [type]: { width, height } }));
                        }
                      }}
                    />
                  ) : (
                    <span className="px-2 text-center text-xs text-zinc-400">No upload</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-zinc-200 bg-white p-5 shadow-soft">
            <h2 className="font-din text-sm uppercase text-zinc-700">Select a document</h2>
            <div className="mt-3 space-y-2">
              {EVIDENCE_TYPES.map((type) => {
                const doc = submission.evidence.find((item) => item.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => doc?.hasOriginal && setActiveType(type)}
                    disabled={!doc?.hasOriginal}
                    className={`w-full border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      activeType === type ? "border-uplands-magenta bg-uplands-paper text-uplands-charcoal" : "border-zinc-200 hover:border-uplands-magenta"
                    }`}
                  >
                    <span className="font-medium">{EVIDENCE_LABELS[type]}</span>
                    {!doc?.hasOriginal && <span className="block text-xs text-zinc-400">No upload</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {activeType && activeTransform && (
            <div className="border border-zinc-200 bg-white p-5 shadow-soft">
              <h2 className="font-din text-sm uppercase text-zinc-700">{EVIDENCE_LABELS[activeType]}</h2>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Zoom</span>
                    <span className="font-mono text-zinc-700">×{activeTransform.scale.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step={0.01}
                    value={activeTransform.scale}
                    onPointerDown={() => pushHistory(activeType)}
                    onChange={(event) => setScale(Number(event.target.value), false)}
                    className="mt-1 w-full"
                  />
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => setScale(activeTransform.scale / 1.15)} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta">−</button>
                    <button onClick={() => setScale(activeTransform.scale * 1.15)} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta">+</button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500">Rotation</span>
                  <div className="mt-1 flex gap-2">
                    <button onClick={rotateCounterClockwise} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta">⟲ 90°</button>
                    <button onClick={rotateClockwise} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta">⟳ 90°</button>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Current: {activeTransform.rotation}°</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={applyFit} className={`flex-1 border py-1.5 text-sm ${activeTransform.fitMode === "fit" ? "border-uplands-magenta bg-uplands-paper text-uplands-magenta" : "border-zinc-300 hover:border-uplands-magenta hover:text-uplands-magenta"}`}>Fit</button>
                  <button onClick={applyFill} className={`flex-1 border py-1.5 text-sm ${activeTransform.fitMode === "fill" ? "border-uplands-magenta bg-uplands-paper text-uplands-magenta" : "border-zinc-300 hover:border-uplands-magenta hover:text-uplands-magenta"}`}>Fill</button>
                  <button onClick={reset} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta">Reset</button>
                </div>

                <div className="flex gap-2 border-t border-zinc-100 pt-3">
                  <button onClick={undo} disabled={past.length === 0} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-40">Undo</button>
                  <button onClick={redo} disabled={future.length === 0} className="flex-1 border border-zinc-300 py-1.5 text-sm hover:border-uplands-magenta hover:text-uplands-magenta disabled:opacity-40">Redo</button>
                </div>

                {activeNatural && (
                  <p className="text-xs text-zinc-400">
                    Offset X {activeTransform.offsetX.toFixed(3)} · Y {activeTransform.offsetY.toFixed(3)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border border-zinc-200 bg-white p-5 text-xs text-zinc-500 shadow-soft">
            <p><strong className="text-zinc-700">Tip:</strong> drag the document to move it inside its frame. The frame position is fixed — only the document inside it is edited. Changes are non-destructive.</p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-uplands-charcoal px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
