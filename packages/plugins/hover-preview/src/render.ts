import { escapeHtmlAttribute } from "@riebeckite/core";
import type { ResolvedHoverPreviewOptions } from "./types.js";

export const HOVER_PREVIEW_SCRIPT_ID = "rb-hover-preview-data";
export const HOVER_PREVIEW_ATTRIBUTE = "data-rb-hover-preview";
export const HOVER_PREVIEW_INDEX_PATH = "_riebeckite/hover-preview/index.json";

export function renderHoverPreviewPayload(
  options: ResolvedHoverPreviewOptions,
  indexUrl: string,
): string {
  const attributes = [
    'type="application/json"',
    `id="${escapeHtmlAttribute(HOVER_PREVIEW_SCRIPT_ID)}"`,
    HOVER_PREVIEW_ATTRIBUTE,
    `data-index-src="${escapeHtmlAttribute(indexUrl)}"`,
    `data-selector="${escapeHtmlAttribute(options.selector)}"`,
    `data-delay="${escapeHtmlAttribute(String(options.delay))}"`,
    `data-class-name="${escapeHtmlAttribute(options.className)}"`,
    `data-include-titles="${escapeHtmlAttribute(String(options.includeTitles))}"`,
  ].join(" ");

  return `<script ${attributes}></script>`;
}

export function hasInternalLink(html: string): boolean {
  return /href\s*=\s*["']?\//.test(html);
}
