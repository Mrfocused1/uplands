/**
 * Browser-side image handling for evidence uploads. Captures and files are
 * scaled down (never cropped) to a storage-friendly size and encoded as JPEG
 * data URLs for localStorage / submission.
 */

export const MAX_DIMENSION = 1800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image"));
    image.src = src;
  });
}

type Drawable = HTMLImageElement | HTMLVideoElement;

function intrinsicSize(source: Drawable) {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.naturalWidth, height: source.naturalHeight };
}

/** Draw an image/video source onto a canvas, scaled down to MAX_DIMENSION and returned as JPEG. */
export function drawToDataUrl(source: Drawable, quality: number): string {
  const { width, height } = intrinsicSize(source);
  if (!width || !height) throw new Error("Empty source");

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

/** Read a File, scale it down (no crop), and return a JPEG data URL. */
export async function fileToCompressedDataUrl(file: File, quality = 0.9): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    return drawToDataUrl(image, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
