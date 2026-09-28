import type { BasesSpec } from "./types.js";

/**
 * Build-time placeholder that stands in for a `base` code block until the
 * content manifest (and therefore every entry's frontmatter, tags, links, and
 * permalink) is available.
 *
 * The compiled spec and the raw block source are URI-encoded so they survive an
 * HTML attribute round-trip through `rehype-raw` without quoting hazards. The
 * attribute is removed when the runtime replaces the placeholder with rendered
 * HTML, so it never reaches the published page.
 */
export const BASES_ATTRIBUTE = "data-rr-bases";

export type BasesPlaceholderPayload = {
  readonly spec: BasesSpec;
  readonly source: string;
};

export function encodeBasesPayload(payload: BasesPlaceholderPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeBasesPayload(
  encoded: string,
): BasesPlaceholderPayload | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<BasesPlaceholderPayload>;
    if (typeof candidate.source !== "string" || !candidate.spec) return null;
    return candidate as BasesPlaceholderPayload;
  } catch {
    return null;
  }
}

export function createBasesPlaceholder(
  payload: BasesPlaceholderPayload,
): string {
  return `<div ${BASES_ATTRIBUTE}="${encodeBasesPayload(payload)}"></div>`;
}

/** A fresh global pattern is returned per call to avoid shared `lastIndex`. */
export function createBasesPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${BASES_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
