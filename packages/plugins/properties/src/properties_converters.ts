import {
  DEFAULT_PROPERTY_DATE_FORMAT,
  formatPropertyDate,
  isValidDatePattern,
  parsePropertyDate,
} from "./date.js";
import {
  convertInline,
  isExternalHref,
  matchWholeWikilink,
  safeHref,
  wikilinkValue,
} from "./inline.js";
import { isPlainObject } from "./object.js";
import { convertNested } from "./properties_bridge.js";
import { report, safeString } from "./properties_helpers.js";
import type { ConversionState } from "./properties_types.js";
import { isEmptyPropertyValue } from "./selection.js";
import { buildTagHref } from "./tag.js";
import type {
  PropertiesFieldConfig,
  PropertyTagVariant,
  PropertyValue,
} from "./types.js";

export function convertText(
  value: unknown,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) => convertText(item, key, state, depth + 1)),
    };
  }
  if (value instanceof Date) {
    return parsePropertyDate(value)
      ? { kind: "text", text: value.toISOString() }
      : { kind: "text", text: String(value) };
  }
  if (isPlainObject(value)) {
    return {
      kind: "group",
      entries: Object.entries(value)
        .filter(
          ([, entryValue]) =>
            !(state.options.hideEmpty && isEmptyPropertyValue(entryValue)),
        )
        .map(([entryKey, entryValue]) => ({
          key: entryKey,
          value: convertNested(
            entryValue,
            entryKey,
            undefined,
            state,
            depth + 1,
          ),
        })),
    };
  }
  return { kind: "text", text: safeString(value) };
}

export function convertLink(
  value: unknown,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) => convertLink(item, key, state, depth + 1)),
    };
  }
  if (typeof value !== "string") {
    return convertText(value, key, state, depth);
  }

  const wikilink = matchWholeWikilink(value);
  if (wikilink) {
    return (
      wikilinkValue(wikilink.target, wikilink.label, state) ?? {
        kind: "text",
        text: value,
      }
    );
  }

  const href = safeHref(value);
  return href
    ? { kind: "link", text: value, href, external: isExternalHref(href) }
    : { kind: "text", text: value };
}

export function convertTags(
  value: unknown,
  field: Extract<PropertiesFieldConfig, { type: "tags" }>,
  state: ConversionState,
): PropertyValue {
  const variant = tagVariant(field);
  const linked = field.link !== false && variant !== "text";
  const values = Array.isArray(value) ? value : [value];
  const tags = values.flatMap((item) => {
    const tag = tagText(item);
    if (!tag) return [];
    const href = linked
      ? (safeHref(
          state.context.resolveTag?.(tag) ?? buildTagHref(tag, field.tagBase),
        ) ?? undefined)
      : undefined;
    return [{ tag, text: tagLabel(item, tag), href }];
  });

  return { kind: "tags", tags, variant };
}

export function convertBadge(
  value: unknown,
  field: Extract<PropertiesFieldConfig, { type: "badge" }>,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) =>
        convertBadge(item, field, key, state, depth + 1),
      ),
    };
  }
  if (isPlainObject(value) || typeof value === "symbol") {
    return convertText(value, key, state, depth);
  }

  const text = badgeText(value);
  const variant = field.variants?.[text];
  return variant === undefined
    ? { kind: "badge", text }
    : { kind: "badge", text, variant };
}

export function convertDate(
  value: unknown,
  field: Extract<PropertiesFieldConfig, { type: "date" }>,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) =>
        convertDate(item, field, key, state, depth + 1),
      ),
    };
  }

  const date = parsePropertyDate(value);
  if (!date) {
    report(state, key, value, "invalid date");
    return { kind: "text", text: safeString(value) };
  }

  const pattern =
    field.format && isValidDatePattern(field.format)
      ? field.format
      : DEFAULT_PROPERTY_DATE_FORMAT;
  return {
    kind: "date",
    value:
      typeof value === "string"
        ? value.trim().replace(" ", "T")
        : date.toISOString(),
    formatted: formatPropertyDate(date, pattern),
  };
}

export function convertWikilinks(
  value: unknown,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) => convertWikilinks(item, key, state, depth + 1)),
    };
  }
  if (isPlainObject(value)) {
    return convertText(value, key, state, depth);
  }
  if (typeof value !== "string") {
    return convertText(value, key, state, depth);
  }

  const inline = convertInline(value, state, true);
  return inline ?? { kind: "text", text: value };
}

export function tagVariant(
  field: Extract<PropertiesFieldConfig, { type: "tags" }>,
): PropertyTagVariant {
  if (field.variant) return field.variant;
  return field.link === false ? "text" : "chips";
}

export function tagText(value: unknown): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "bigint" &&
    typeof value !== "boolean"
  ) {
    return null;
  }
  return String(value).replace(/^#/, "").trim() || null;
}

export function tagLabel(value: unknown, tag: string): string {
  return typeof value === "string" && value.trim().startsWith("#")
    ? value.trim()
    : `#${tag}`;
}

export function badgeText(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  return safeString(value);
}

export function isTagValue(key: string, values: readonly unknown[]): boolean {
  if (isTagKey(key)) return true;
  return (
    values.length > 0 &&
    values.every(
      (value) => typeof value === "string" && value.trim().startsWith("#"),
    )
  );
}

export function isTagString(key: string, value: string): boolean {
  return isTagKey(key) || value.trim().startsWith("#");
}

export function isTagKey(key: string): boolean {
  return key === "tags" || key === "tag";
}
