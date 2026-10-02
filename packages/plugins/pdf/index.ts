import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { PDF_HEIGHT_PATTERN, resolvePdfOptions } from "./src/options.js";
import { renderPdf } from "./src/render.js";
import type { PdfOptions } from "./src/types.js";

export {
  DEFAULT_PDF_DOWNLOAD_LABEL,
  DEFAULT_PDF_HEIGHT,
  PDF_HEIGHT_PATTERN,
  resolvePdfOptions,
} from "./src/options.js";
export {
  buildPdfViewerUrl,
  isPdfRenderTarget,
  PDF_ATTRIBUTE,
  renderPdf,
} from "./src/render.js";
export type { PdfOptions, ResolvedPdfOptions } from "./src/types.js";

export const PDF_PLUGIN_NAME = "pdf";

/**
 * Inline PDF attachment viewer.
 *
 * Obsidian embeds like `![[report.pdf]]` are rendered by
 * `@riebeckite/plugin-obsidian-markdown` through the renderer contract. This
 * plugin answers that call for PDFs with the browser-native PDF viewer
 * (`<object type="application/pdf">`), a graceful download fallback, and file
 * metadata. Plain links (`[[report.pdf]]`) keep the download link that
 * `@riebeckite/plugin-attachment` provides.
 *
 * The renderer runs before `attachment` and `media` (negative `order`), so a
 * PDF embed is never captured by the generic attachment card. No client
 * runtime is needed; everything is emitted at build time.
 */
export function pdf(options: PdfOptions = {}) {
  const resolved = resolvePdfOptions(options);
  return definePlugin({
    name: PDF_PLUGIN_NAME,
    order: -20,
    processedContentCache: {
      version: "pdf-v1",
      dependencyMode: "tracked",
    },
    options,
    validateOptions: validatePdfOptions,
    renderers: [
      {
        name: "pdf-viewer",
        render: (context) => renderPdf(context, resolved),
      },
    ],
    assets: [createStyleAsset(PDF_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const pdfPlugin = pdf;

function validatePdfOptions(
  options: PdfOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (options.height !== undefined) {
    const valid =
      typeof options.height === "number"
        ? Number.isFinite(options.height) && options.height > 0
        : typeof options.height === "string" &&
          PDF_HEIGHT_PATTERN.test(options.height.trim());
    if (!valid) {
      issues.push({
        path: "height",
        message:
          'Expected a positive number or a CSS length (e.g. "640px", "70vh").',
      });
    }
  }
  if (
    options.initialPage !== undefined &&
    (!Number.isInteger(options.initialPage) || options.initialPage < 1)
  ) {
    issues.push({
      path: "initialPage",
      message: "Expected a positive integer.",
    });
  }
  for (const key of ["toolbar", "showMetadata"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  if (
    options.downloadLabel !== undefined &&
    (typeof options.downloadLabel !== "string" ||
      options.downloadLabel.trim() === "")
  ) {
    issues.push({
      path: "downloadLabel",
      message: "Expected a non-empty string.",
    });
  }
  return issues;
}
