"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

type SignaturePadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [confirmed, setConfirmed] = useState(Boolean(value));

  function draw(nextStrokes: Stroke[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, rect.width, rect.height);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#1d1d1f";

    nextStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    });
  }

  useEffect(() => {
    draw(strokes);
  }, [strokes]);

  useEffect(() => {
    setConfirmed(Boolean(value));
  }, [value]);

  useEffect(() => {
    const handleResize = () => draw(strokes);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [strokes]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function commitSignature(nextStrokes: Stroke[]) {
    draw(nextStrokes);
    const canvas = canvasRef.current;
    const nextValue = nextStrokes.length && canvas ? canvas.toDataURL("image/png") : null;
    onChange(nextValue);
    setConfirmed(Boolean(nextValue));
  }

  function updateStrokes(nextStrokes: Stroke[]) {
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }

  function updateActiveStroke(nextStroke: Stroke | null) {
    activeStrokeRef.current = nextStroke;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-zinc-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-56 w-full touch-none"
          aria-label="Digital signature pad"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateActiveStroke([pointFromEvent(event)]);
            setConfirmed(false);
          }}
          onPointerMove={(event) => {
            const currentStroke = activeStrokeRef.current;
            if (!currentStroke) return;
            const nextStroke = [...currentStroke, pointFromEvent(event)];
            updateActiveStroke(nextStroke);
            draw([...strokesRef.current, nextStroke]);
          }}
          onPointerUp={() => {
            const currentStroke = activeStrokeRef.current;
            if (!currentStroke) return;
            const nextStrokes = [...strokesRef.current, currentStroke];
            updateStrokes(nextStrokes);
            updateActiveStroke(null);
            commitSignature(nextStrokes);
          }}
          onPointerCancel={() => updateActiveStroke(null)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            updateStrokes([]);
            updateActiveStroke(null);
            commitSignature([]);
          }}
          className="min-h-11 border border-zinc-300 px-4 font-bold text-zinc-700"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const next = strokesRef.current.slice(0, -1);
            updateStrokes(next);
            commitSignature(next);
          }}
          className="min-h-11 border border-zinc-300 px-4 font-bold text-zinc-700"
        >
          Undo
        </button>
        <button type="button" onClick={() => commitSignature(strokesRef.current)} className="min-h-11 bg-uplands-magenta px-4 font-bold text-white">
          Confirm signature
        </button>
      </div>
      <p className="text-sm text-zinc-600">{confirmed ? "Signature confirmed" : "Signature not provided"}</p>
    </div>
  );
}
