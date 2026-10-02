import {
  escapeHtml,
  escapeHtmlAttribute,
  getExtension,
  type PluginRenderContext,
  readContentSourceEntry,
} from "@riebeckite/core";
import type { ResolvedPdfOptions } from "./types.js";

export const PDF_ATTRIBUTE = "data-pdf-path";

/**
 * Whether this render target is a PDF attachment.
 *
 * `@riebeckite/plugin-obsidian-markdown` currently resolves every non-image,
 * non-Markdown file as `kind: "attachment"`, so PDFs are recognized by their
 * extension. The `kind: "pdf"` branch is kept so the plugin also works if a
 * future producer reports a PDF-specific target kind.
 */
export function isPdfRenderTarget(context: PluginRenderContext): boolean {
  if (context.kind === "pdf") return true;
  return (
    context.kind === "attachment" &&
    getExtension(context.path).toLowerCase() === "pdf"
  );
}

/**
 * Builds the viewer URL: the attachment URL plus the native PDF viewer
 * controls encoded as a URL fragment (`#page=2&toolbar=0`).
 */
export function buildPdfViewerUrl(
  url: string,
  options: ResolvedPdfOptions,
): string {
  const params: string[] = [];
  if (options.initialPage > 1) params.push(`page=${options.initialPage}`);
  if (!options.toolbar) params.push("toolbar=0");
  if (params.length === 0) return url;

  const fragmentStart = url.indexOf("#");
  const base = fragmentStart === -1 ? url : url.slice(0, fragmentStart);
  return `${base}#${params.join("&")}`;
}

/**
 * Renders an embedded PDF (`![[report.pdf]]`) with the browser-native viewer,
 * a fallback download link, and file metadata. Plain attachment links keep the
 * download link that `@riebeckite/plugin-attachment` or the Markdown fallback
 * provides, so this renderer only handles embeds.
 */
export async function renderPdf(
  context: PluginRenderContext,
  options: ResolvedPdfOptions,
): Promise<string | null> {
  if (!context.embed) return null;
  if (!isPdfRenderTarget(context)) return null;

  const fileName = getFileName(context.path);
  const viewerUrl = buildPdfViewerUrl(context.url, options);
  const size = options.showMetadata ? await getAttachmentSize(context) : null;
  const sizeHtml = size
    ? `\n    <span class="rr-pdf__size">${escapeHtml(size)}</span>`
    : "";
  const metaHtml = options.showMetadata
    ? `\n    <span class="rr-pdf__format">PDF</span>
    <span class="rr-pdf__name">${escapeHtml(fileName)}</span>${sizeHtml}`
    : "";

  return `<figure class="rr-pdf" ${PDF_ATTRIBUTE}="${escapeHtmlAttribute(context.path)}" style="--rr-pdf-height: ${escapeHtmlAttribute(options.height)}">
  <object class="rr-pdf__viewer" data="${escapeHtmlAttribute(viewerUrl)}" type="application/pdf" aria-label="${escapeHtmlAttribute(fileName)}">
    <a class="rr-pdf__fallback" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(options.downloadLabel)}</a>
  </object>
  <figcaption class="rr-pdf__meta">${metaHtml}
    <a class="rr-pdf__download" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(options.downloadLabel)}</a>
  </figcaption>
</figure>`;
}

async function getAttachmentSize(
  context: PluginRenderContext,
): Promise<string | null> {
  if (!context.contentSource) return null;
  const content = await readContentSourceEntry(
    context.contentSource,
    context.path,
  );
  if (content === null) return null;
  const bytes =
    typeof content === "string"
      ? new TextEncoder().encode(content).byteLength
      : content.byteLength;
  return formatBytes(bytes);
}

function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
