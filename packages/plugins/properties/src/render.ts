import {
  escapeHtml,
  escapeHtmlAttribute,
  normalizeTag,
} from "@riebeckite/core";
import { DEFAULT_TAG_BASE, resolvePropertiesOptions } from "./options.js";
import type {
  PropertiesOptions,
  PropertiesRenderContext,
  ResolvedPropertiesOptions,
} from "./types.js";

/** Matches `[[target]]` / `[[target|label]]` wikilinks inside a string value. */
const WIKILINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/;
const LINK_PATTERN = new RegExp(
  `${WIKILINK_PATTERN.source}|(https?:\\/\\/[^\\s<>"'()]+)`,
  "g",
);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+)?$/;
const MAX_DEPTH = 6;

type RenderState = {
  cls: string;
  options: ResolvedPropertiesOptions;
  context: PropertiesRenderContext;
};

/**
 * Renders an Obsidian-style note property panel from a frontmatter object.
 *
 * The function is pure: it only reads its arguments and returns HTML. It is
 * exported separately from the plugin so it can be exercised in isolation.
 * Returns an empty string when there is nothing to render.
 */
export function renderPropertiesPanel(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: PropertiesOptions = {},
  context: PropertiesRenderContext = {},
): string {
  const resolved = resolvePropertiesOptions(options);
  const entries = selectProperties(frontmatter, resolved);
  if (entries.length === 0) return "";

  const cls = resolved.className;
  const state: RenderState = { cls, options: resolved, context };
  const rows = entries
    .map(([key, value]) => renderRow(key, value, state, 0))
    .join("");
  const list = `<dl class="${cls}__rows">${rows}</dl>`;
  const heading =
    resolved.title === null
      ? ""
      : `<h2 class="${cls}__title">${escapeHtml(resolved.title)}</h2>`;
  const attributes = `data-properties data-property-count="${entries.length}"`;

  if (resolved.collapsed) {
    return (
      `<details class="${cls}" ${attributes} data-collapsed>` +
      `<summary class="${cls}__summary">${heading}</summary>` +
      `${list}</details>`
    );
  }
  return `<section class="${cls}" ${attributes}>${heading}${list}</section>`;
}

/** Builds the `href` for a tag value using the site tag route. */
export function buildTagHref(
  raw: string,
  base: string = DEFAULT_TAG_BASE,
): string {
  const cleaned = raw.replace(/^#/, "").trim();
  const normalized = normalizeTag(cleaned) ?? cleaned;
  const path = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment.toLowerCase()))
    .join("/");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path}`;
}

function selectProperties(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: ResolvedPropertiesOptions,
): Array<[string, unknown]> {
  if (!frontmatter || typeof frontmatter !== "object") return [];

  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (options.include) {
      if (!options.include.includes(key)) continue;
    } else if (options.exclude.includes(key)) {
      continue;
    }
    if (value === undefined) continue;
    if (options.hideEmpty && isEmptyValue(value)) continue;
    entries.push([key, value]);
  }
  return applyOrder(entries, options.order);
}

/**
 * Reorders selected entries: keys listed in `order` come first in that exact
 * order, then the remaining entries keep their frontmatter order. Keys in
 * `order` that were not selected are ignored, and no selected key is dropped.
 */
function applyOrder(
  entries: ReadonlyArray<[string, unknown]>,
  order: readonly string[] | undefined,
): Array<[string, unknown]> {
  if (!order || order.length === 0) return [...entries];

  const remaining = new Map(entries);
  const ordered: Array<[string, unknown]> = [];
  for (const key of order) {
    if (remaining.has(key)) {
      ordered.push([key, remaining.get(key)]);
      remaining.delete(key);
    }
  }
  for (const entry of entries) {
    if (remaining.has(entry[0])) ordered.push(entry);
  }
  return ordered;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return false;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

function renderRow(
  key: string,
  value: unknown,
  state: RenderState,
  depth: number,
): string {
  const { cls } = state;
  return (
    `<div class="${cls}__row" data-property-key="${escapeHtmlAttribute(key)}">` +
    `<dt class="${cls}__key">${escapeHtml(key)}</dt>` +
    `<dd class="${cls}__value">${renderValue(value, key, state, depth)}</dd>` +
    "</div>"
  );
}

function renderValue(
  value: unknown,
  key: string,
  state: RenderState,
  depth: number,
): string {
  if (depth > MAX_DEPTH) {
    report(state, key, value, "nested too deeply");
    return escapeHtml(safeString(value));
  }

  try {
    return renderValueInternal(value, key, state, depth);
  } catch (error) {
    report(state, key, value, formatError(error));
    return escapeHtml(safeString(value));
  }
}

function renderValueInternal(
  value: unknown,
  key: string,
  state: RenderState,
  depth: number,
): string {
  const { cls } = state;

  if (Array.isArray(value)) {
    return renderList(value, key, state, depth);
  }

  if (typeof value === "string") {
    if (isTagValue(key, value)) return renderTag(value, state);
    const iso = value.trim();
    if (ISO_DATE_PATTERN.test(iso)) {
      const parsed = new Date(iso);
      if (!Number.isNaN(parsed.getTime())) {
        return renderDate(iso, iso, state);
      }
    }
    return renderString(value, state);
  }

  if (typeof value === "boolean") {
    return `<span class="${cls}__boolean" data-boolean="${value}">${value}</span>`;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      report(state, key, value, "non-finite number");
      return escapeHtml(String(value));
    }
    return `<span class="${cls}__number" data-number="${value}">${value}</span>`;
  }

  if (typeof value === "bigint") {
    const text = value.toString();
    return `<span class="${cls}__number" data-number="${text}">${text}</span>`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      report(state, key, value, "invalid date");
      return escapeHtml(String(value));
    }
    return renderDate(
      value.toISOString(),
      value.toISOString().slice(0, 10),
      state,
    );
  }

  if (isPlainObject(value)) {
    return renderObject(value, state, depth);
  }

  report(state, key, value, "unsupported value type");
  return escapeHtml(safeString(value));
}

function renderList(
  items: readonly unknown[],
  key: string,
  state: RenderState,
  depth: number,
): string {
  const { cls } = state;
  const children = items
    .map(
      (item) =>
        `<li class="${cls}__list-item">` +
        `${renderValue(item, key, state, depth + 1)}</li>`,
    )
    .join("");
  return `<ul class="${cls}__list">${children}</ul>`;
}

function renderObject(
  value: Readonly<Record<string, unknown>>,
  state: RenderState,
  depth: number,
): string {
  const { cls } = state;
  const rows = Object.entries(value)
    .filter(([, item]) => !(state.options.hideEmpty && isEmptyValue(item)))
    .map(([key, item]) => renderRow(key, item, state, depth + 1))
    .join("");
  return `<dl class="${cls}__nested">${rows}</dl>`;
}

function renderTag(value: string, state: RenderState): string {
  const { cls, context } = state;
  const raw = value.replace(/^#/, "").trim();
  const href = context.resolveTag ? context.resolveTag(raw) : buildTagHref(raw);
  const label = value.startsWith("#") ? value : `#${value}`;
  return (
    `<a class="${cls}__tag" data-tag="${escapeHtmlAttribute(raw)}" ` +
    `href="${escapeHtmlAttribute(href)}">${escapeHtml(label)}</a>`
  );
}

function renderDate(
  datetime: string,
  display: string,
  state: RenderState,
): string {
  const { cls } = state;
  return (
    `<time class="${cls}__date" datetime="${escapeHtmlAttribute(datetime)}">` +
    `${escapeHtml(display)}</time>`
  );
}

function renderString(value: string, state: RenderState): string {
  const { cls, context } = state;
  let html = "";
  let lastIndex = 0;

  LINK_PATTERN.lastIndex = 0;
  for (
    let match = LINK_PATTERN.exec(value);
    match !== null;
    match = LINK_PATTERN.exec(value)
  ) {
    if (match.index > lastIndex) {
      html += escapeHtml(value.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      html += renderWikilink(
        match[1].trim(),
        (match[2] ?? match[1]).trim(),
        cls,
        context,
      );
    } else if (match[3] !== undefined) {
      html += renderExternalLink(match[3], cls);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) html += escapeHtml(value.slice(lastIndex));
  return html;
}

function renderWikilink(
  target: string,
  label: string,
  cls: string,
  context: PropertiesRenderContext,
): string {
  const [path, anchor] = target.split(/[#^]/, 2);
  const href = path ? (context.resolveLink?.(path) ?? null) : null;
  if (!href) return escapeHtml(`[[${target}]]`);
  const url = anchor ? `${href}#${anchor}` : href;
  return `<a class="${cls}__link" href="${escapeHtmlAttribute(url)}">${escapeHtml(label)}</a>`;
}

function renderExternalLink(url: string, cls: string): string {
  return (
    `<a class="${cls}__link ${cls}__link--external" ` +
    `href="${escapeHtmlAttribute(url)}" rel="noopener noreferrer" ` +
    `target="_blank">${escapeHtml(url)}</a>`
  );
}

function isTagValue(key: string, value: string): boolean {
  return key === "tags" || key === "tag" || value.trim().startsWith("#");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function report(
  state: RenderState,
  key: string,
  value: unknown,
  reason: string,
): void {
  state.context.onMessage?.({
    reason: `Property \`${key}\` could not be rendered (${reason}); rendered as escaped text.`,
    propertyKey: key,
    value,
  });
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    return Object.prototype.toString.call(value);
  }
  return String(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
