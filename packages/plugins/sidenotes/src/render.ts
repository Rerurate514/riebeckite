import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { HastNode, ResolvedSidenotesOptions } from "./types.js";

/** Feature hooks follow the `rr-sidenotes` convention from the CSS hooks doc. */
export const SIDENOTES_REF_CLASS = "rr-sidenotes__ref";
export const SIDENOTES_TOGGLE_CLASS = "rr-sidenotes__toggle";
export const SIDENOTES_NOTE_CLASS = "rr-sidenotes__note";
export const SIDENOTES_NOTE_OPEN_MODIFIER = "rr-sidenotes__note--open";
export const SIDENOTES_POPOVER_PREFIX = "rr-sidenotes__note--popover-";
export const SIDENOTES_INDEX_CLASS = "rr-sidenotes__index";
export const SIDENOTES_BODY_CLASS = "rr-sidenotes__body";
export const SIDENOTES_FOOTNOTES_CLASS = "rr-sidenotes__footnotes";

export const SIDENOTES_NOTE_ID_PREFIX = "rr-sidenotes-";

/**
 * GFM footnote definitions and references share a normalized key such as `1`
 * or `two`, mirrored between `#user-content-fn-{key}` (the target) and
 * `#user-content-fnref-{key}` (the reference). The core pipeline uses the
 * `user-content-` clobber prefix by default.
 */
const FOOTNOTE_HREF_PREFIX = "#user-content-fn-";

/** Extracts the footnote key from a reference href. Returns `null` when the
 * href does not look like a footnote target. */
export function sidenotesKey(href: string): string | null {
  if (href.startsWith(FOOTNOTE_HREF_PREFIX)) {
    return href.slice(FOOTNOTE_HREF_PREFIX.length);
  }
  const marker = href.lastIndexOf("-fn-");
  return marker === -1 ? null : href.slice(marker + "-fn-".length);
}

/** Stable id shared by a sidenote and its toggles' `aria-controls`. */
export function sidenotesNoteId(key: string): string {
  return `${SIDENOTES_NOTE_ID_PREFIX}${key}`;
}

export type SidenotesReferenceInput = {
  /** Existing `href` of the GFM footnote reference, kept for reachability. */
  href: string;
  /** Existing `id` of the GFM footnote reference, kept for back-links. */
  id: string;
  /** Display number already chosen by the footnote pipeline. */
  index: string;
  options: ResolvedSidenotesOptions;
};

/**
 * Renders the inline reference link that replaces a GFM footnote reference.
 * The surrounding `sup` is managed by the rehype transformer so it can reuse
 * the existing wrapper when one is already present.
 */
export function renderSidenotesReference(
  input: SidenotesReferenceInput,
): string {
  const { href, id, index, options } = input;
  const key = sidenotesKey(href) ?? "";
  const label = `${options.openLabel} ${index}`.trim();
  return (
    "" +
    `<a href="${escapeHtmlAttribute(href)}" ` +
    `id="${escapeHtmlAttribute(id)}" ` +
    `class="${SIDENOTES_TOGGLE_CLASS}" ` +
    `data-rr-sidenotes-ref ` +
    `aria-expanded="false" ` +
    `aria-controls="${escapeHtmlAttribute(sidenotesNoteId(key))}" ` +
    `aria-label="${escapeHtmlAttribute(label)}">` +
    `${escapeHtml(index)}` +
    `</a>`
  );
}

export type SidenotesNoteInput = {
  key: string;
  index: string;
  /** Serialized definition content (back-links stripped). */
  bodyHtml: string;
  options: ResolvedSidenotesOptions;
};

/**
 * Renders the sidenote: a static margin note on desktop and the popover
 * source on mobile.
 */
export function renderSidenotesNote(input: SidenotesNoteInput): string {
  const { key, index, bodyHtml, options } = input;
  const className = [
    SIDENOTES_NOTE_CLASS,
    `${SIDENOTES_POPOVER_PREFIX}${options.popoverAlignment}`,
    ...(options.className === "" ? [] : [options.className]),
  ].join(" ");
  const label = `${options.ariaLabel} ${index}`.trim();
  return (
    "" +
    `<aside class="${escapeHtmlAttribute(className)}" ` +
    `id="${escapeHtmlAttribute(sidenotesNoteId(key))}" ` +
    `data-rr-sidenotes-note ` +
    `aria-label="${escapeHtmlAttribute(label)}" ` +
    `tabindex="-1">` +
    `<span class="${SIDENOTES_INDEX_CLASS}" aria-hidden="true">` +
    `${escapeHtml(index)}` +
    `</span>` +
    `<div class="${SIDENOTES_BODY_CLASS}">${bodyHtml}</div>` +
    `</aside>`
  );
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Serializes existing hast children into the HTML embedded in a sidenote
 * body. The output is inserted as a `raw` node and serialized verbatim, so
 * every text value and attribute is escaped here.
 */
export function renderHastChildren(children: readonly HastNode[]): string {
  return children.map(renderHastNode).join("");
}

function renderHastNode(node: HastNode): string {
  if (node.type === "text" && typeof node.value === "string") {
    return escapeHtml(node.value);
  }
  if (node.type === "raw" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "comment" && typeof node.value === "string") {
    return `<!--${node.value}-->`;
  }
  if (node.type !== "element") return "";
  const { tagName, properties, children = [] } = node;
  const attributes = renderHastAttributes(properties);
  const content = renderHastChildren(children);
  if (VOID_ELEMENTS.has(tagName)) return `<${tagName}${attributes}>`;
  return `<${tagName}${attributes}>${content}</${tagName}>`;
}

function renderHastAttributes(
  properties: Record<string, unknown> | undefined,
): string {
  if (!properties) return "";
  let result = "";
  for (const [name, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;
    const attributeName =
      name === "className" ? "class" : hyphenateAttribute(name);
    result += ` ${attributeName}`;
    if (value === false) continue;
    if (value === true) {
      result += '=""';
      continue;
    }
    const stringValue = Array.isArray(value)
      ? value.filter((entry) => entry !== null && entry !== undefined).join(" ")
      : String(value);
    result += `="${escapeHtmlAttribute(stringValue)}"`;
  }
  return result;
}

function hyphenateAttribute(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
