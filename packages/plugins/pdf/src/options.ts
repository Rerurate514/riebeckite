import type { PdfOptions, ResolvedPdfOptions } from "./types.js";

export const DEFAULT_PDF_HEIGHT = "640px";
export const DEFAULT_PDF_DOWNLOAD_LABEL = "Download PDF";

/**
 * CSS lengths accepted for the `height` option. Restricting the value keeps a
 * misconfigured length from injecting extra declarations into the inline
 * custom property.
 */
export const PDF_HEIGHT_PATTERN =
  /^(?:auto|0|[0-9]*\.?[0-9]+(?:px|rem|em|vh|vw|vmin|vmax|%|pt|pc|ch))$/i;

export function resolvePdfOptions(
  options: PdfOptions = {},
): ResolvedPdfOptions {
  return {
    height: normalizeHeight(options.height),
    initialPage: options.initialPage ?? 1,
    toolbar: options.toolbar ?? true,
    showMetadata: options.showMetadata ?? true,
    downloadLabel: options.downloadLabel ?? DEFAULT_PDF_DOWNLOAD_LABEL,
  };
}

function normalizeHeight(height: string | number | undefined): string {
  if (height === undefined) return DEFAULT_PDF_HEIGHT;
  if (typeof height === "number") return `${height}px`;
  return height.trim();
}
