import type { jsPDF } from 'jspdf';

/** Shortens `text` with a trailing "…" until it fits `maxWidth` (in the PDF's current font), unchanged if it already fits. */
export function truncatePdfText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + '…') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}
