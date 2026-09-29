import { escapeHtmlAttribute, escapeScriptJson } from "@riebeckite/core";
import type {
  HoverPreviewIndex,
  ResolvedHoverPreviewOptions,
} from "./types.js";

export const HOVER_PREVIEW_SCRIPT_ID = "rb-hover-preview-data";
export const HOVER_PREVIEW_ATTRIBUTE = "data-rb-hover-preview";

export function renderHoverPreviewPayload(
  index: HoverPreviewIndex,
  options: ResolvedHoverPreviewOptions,
): string {
  const attributes = [
    'type="application/json"',
    `id="${escapeHtmlAttribute(HOVER_PREVIEW_SCRIPT_ID)}"`,
    HOVER_PREVIEW_ATTRIBUTE,
    `data-selector="${escapeHtmlAttribute(options.selector)}"`,
    `data-delay="${escapeHtmlAttribute(String(options.delay))}"`,
    `data-class-name="${escapeHtmlAttribute(options.className)}"`,
    `data-include-titles="${escapeHtmlAttribute(String(options.includeTitles))}"`,
  ].join(" ");

  return `<script ${attributes}>${escapeScriptJson(JSON.stringify(index))}</script>`;
}

export function hasInternalLink(html: string): boolean {
  return /href\s*=\s*["']?\//.test(html);
}
