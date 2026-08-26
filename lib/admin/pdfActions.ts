// Client-only helpers for opening/downloading a generated PDF.
// Opens a branded loading tab (instead of a bare about:blank page) while the PDF
// is fetched, then navigates the tab to the ready blob once it resolves.

const LOADING_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Preparing PDF…</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f7f7f7;
    font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    color: #1d1d1f;
  }
  .box { text-align: center; padding: 24px; }
  .spinner {
    width: 44px;
    height: 44px;
    margin: 0 auto 18px;
    border: 4px solid #e8d0e2;
    border-top-color: #b0008e;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .hint { margin-top: 8px; font-size: 12px; color: #5f5f5f; }
</style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <div class="label">Preparing PDF…</div>
    <div class="hint">This may take a few seconds</div>
  </div>
</body>
</html>`;

/** Opens a new tab showing a spinner page. Returns the window reference so the
 *  caller can navigate it once the PDF is ready. */
export function openPdfLoadingWindow(): Window | null {
  const win = window.open("", "_blank");
  if (!win) return null;
  win.document.write(LOADING_HTML);
  win.document.close();
  return win;
}

function filenameFromDisposition(disposition: string | null): string | null {
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

async function fetchPdfBlob(url: string): Promise<{ blobUrl: string; disposition: string | null }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to prepare the PDF.");
  const blob = await response.blob();
  return {
    blobUrl: URL.createObjectURL(blob),
    disposition: response.headers.get("content-disposition"),
  };
}

export async function viewPdf(url: string) {
  const viewer = openPdfLoadingWindow();
  try {
    const { blobUrl } = await fetchPdfBlob(url);
    if (viewer) {
      viewer.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    if (viewer) viewer.close();
    throw error;
  }
}

export async function downloadPdf(url: string, fallbackFilename: string) {
  const { blobUrl, disposition } = await fetchPdfBlob(url);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filenameFromDisposition(disposition) ?? fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
}
