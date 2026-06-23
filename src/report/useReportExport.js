import { useRef, useState, useCallback } from "react";

/** Resolve after the browser has had two frames to lay out (so the print DOM is committed). */
function nextPaint() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * useReportExport — "Print" the report (the browser's print dialog offers Save as PDF and
 * paper-size selection, so the app doesn't manage either).
 *
 * `print()` mounts the full report (verdict + every section) into a print-only container via
 * `reportRef`. That container is `display:none` on screen and revealed only by `@media print`;
 * the charts inside are rendered at FIXED sizes (printWidth), so they draw fully and correctly
 * without DOM measurement — which is what stops charts from overlapping or spilling off the
 * page. After the DOM settles and fonts load, it calls `window.print()`.
 *
 * Returns { reportRef, printing, print }.
 */
export function useReportExport() {
  const reportRef = useRef(null);
  const [printing, setPrinting] = useState(false);

  const print = useCallback(async () => {
    if (typeof window === "undefined") return;
    setPrinting(true);
    try {
      await nextPaint();
      try { await document.fonts?.ready; } catch { /* fonts API may be unavailable */ }
      await nextPaint();
      window.print();
    } finally {
      // Leave the print container mounted until the dialog is dismissed, then unmount.
      const done = () => { window.removeEventListener("afterprint", done); setPrinting(false); };
      if (typeof window.onafterprint !== "undefined") {
        window.addEventListener("afterprint", done);
        // Fallback in case afterprint never fires (some headless contexts).
        setTimeout(done, 60000);
      } else {
        setPrinting(false);
      }
    }
  }, []);

  return { reportRef, printing, print };
}
