"use client";

import { useEffect, useRef, useState } from "react";

type CameraGuideProps = {
  aspectRatio?: number;
};

const CORNER = "absolute h-8 w-8 border-white";

/**
 * A live, semi-transparent positioning overlay: a clear centre region at the
 * document's aspect ratio with darkened surroundings and four corner guides.
 */
export function CameraGuide({ aspectRatio }: CameraGuideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!aspectRatio || aspectRatio <= 0) {
      setBox(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const maxWidth = containerWidth * 0.92;
      const maxHeight = containerHeight * 0.92;
      let width = maxWidth;
      let height = width / aspectRatio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      setBox({ width, height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [aspectRatio]);

  if (!aspectRatio || !box) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: box.width,
          height: box.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        }}
      >
        <div className={`${CORNER} left-0 top-0 border-l-4 border-t-4`} />
        <div className={`${CORNER} right-0 top-0 border-r-4 border-t-4`} />
        <div className={`${CORNER} bottom-0 left-0 border-b-4 border-l-4`} />
        <div className={`${CORNER} bottom-0 right-0 border-b-4 border-r-4`} />
      </div>
    </div>
  );
}
