import { type ContentManifestEntry, htmlToPlainText } from "@riebeckite/core";
import type { HoverPreviewIndex } from "./types.js";

type PreviewIndexSource = {
  permalink: string;
  slug: string;
  title: string;
  html: string;
};

export function buildPreviewIndex(
  entries: readonly (ContentManifestEntry | PreviewIndexSource)[],
  options: { excerptLength: number; maxEntries?: number },
): HoverPreviewIndex {
  const pool =
    options.maxEntries === undefined
      ? entries
      : entries.slice(0, options.maxEntries);

  const index: HoverPreviewIndex = {};
  for (const entry of pool) {
    index[entry.permalink] = {
      title: entry.title,
      excerpt: createExcerpt(entry.html, options.excerptLength),
      slug: entry.slug,
    };
  }
  return index;
}

export function createExcerpt(html: string, length: number): string {
  const text = htmlToPlainText(html);
  if (text.length <= length) return text;

  const truncated = text.slice(0, Math.max(length - 1, 0)).trimEnd();
  return `${truncated}…`;
}

export { htmlToPlainText } from "@riebeckite/core";
