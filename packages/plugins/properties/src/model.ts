import type {
  ContentIcon,
  ContentIconRegistry,
  PublicContentView,
} from "@riebeckite/core";
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
import { propertiesFieldConfig } from "./options.js";
import { isEmptyPropertyValue, selectProperties } from "./selection.js";
import { buildTagHref } from "./tag.js";
import type {
  PropertiesData,
  PropertiesFieldConfig,
  PropertiesLinkResolver,
  PropertiesMessage,
  PropertiesRenderContext,
  PropertyTagVariant,
  PropertyValue,
  ResolvedPropertiesOptions,
} from "./types.js";

const MAX_DEPTH = 6;

type ConversionState = {
  readonly options: ResolvedPropertiesOptions;
  readonly context: PropertiesRenderContext;
};

export function buildPropertiesData(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: ResolvedPropertiesOptions,
  context: PropertiesRenderContext = {},
): PropertiesData {
  const entries = selectProperties(frontmatter, options);
  const state: ConversionState = { options, context };
  return {
    title: options.title,
    className: options.className,
    collapsed: options.collapsed,
    items: entries.map(([key, value]) => {
      const icon = findPropertyIcon(context.icons, key);
      return {
        key,
        ...(icon ? { icon } : {}),
        value: convertValue(
          value,
          key,
          propertiesFieldConfig(options.fields, key),
          state,
          0,
        ),
      };
    }),
  };
}

export function createViewLinkResolver(
  view: PublicContentView,
): PropertiesLinkResolver {
  return (target) => {
    const key = target.trim();
    if (!key) return null;
    const entry =
      view.findRoutableBySlug(key) ?? view.findRoutableByAlias(key)[0];
    return entry?.permalink ?? null;
  };
}

function convertValue(
  value: unknown,
  key: string,
  field: PropertiesFieldConfig | undefined,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (depth > MAX_DEPTH) {
    report(state, key, value, "nested too deeply");
    return { kind: "text", text: safeString(value) };
  }

  try {
    return field
      ? convertConfigured(value, key, field, state, depth)
      : convertInferred(value, key, state, depth);
  } catch (error) {
    report(state, key, value, formatError(error));
    return { kind: "text", text: safeString(value) };
  }
}

function convertConfigured(
  value: unknown,
  key: string,
  field: PropertiesFieldConfig,
  state: ConversionState,
  depth: number,
): PropertyValue {
  switch (field.type) {
    case "text":
      return convertText(value, key, state, depth);
    case "link":
      return convertLink(value, key, state, depth);
    case "tags":
      return convertTags(value, field, state);
    case "badge":
      return convertBadge(value, field, key, state, depth);
    case "date":
      return convertDate(value, field, key, state, depth);
    case "wikilinks":
      return convertWikilinks(value, key, state, depth);
    default:
      return convertInferred(value, key, state, depth);
  }
}

function convertInferred(
  value: unknown,
  key: string,
  state: ConversionState,
  depth: number,
): PropertyValue {
  if (Array.isArray(value)) {
    if (isTagValue(key, value)) {
      return convertTags(value, { type: "tags" }, state);
    }
    return {
      kind: "list",
      items: value.map((item) =>
        convertValue(item, key, undefined, state, depth + 1),
      ),
    };
  }

  if (typeof value === "string") {
    if (isTagString(key, value)) {
      return convertTags(value, { type: "tags" }, state);
    }
    if (parsePropertyDate(value)) {
      return convertDate(value, { type: "date" }, key, state, depth);
    }
    const inline = convertInline(value, state, false);
    return inline ?? { kind: "text", text: value };
  }

  if (typeof value === "boolean") {
    return { kind: "boolean", value };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      report(state, key, value, "non-finite number");
      return { kind: "text", text: String(value) };
    }
    return { kind: "number", value: String(value) };
  }

  if (typeof value === "bigint") {
    return { kind: "number", value: value.toString() };
  }

  if (value instanceof Date) {
    return convertDate(value, { type: "date" }, key, state, depth);
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
          value: convertValue(
            entryValue,
            entryKey,
            undefined,
            state,
            depth + 1,
          ),
        })),
    };
  }

  report(state, key, value, "unsupported value type");
  return { kind: "text", text: safeString(value) };
}

function convertText(
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
          value: convertValue(
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

function convertLink(
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

function convertTags(
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

function convertBadge(
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

function convertDate(
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

function convertWikilinks(
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

function tagVariant(
  field: Extract<PropertiesFieldConfig, { type: "tags" }>,
): PropertyTagVariant {
  if (field.variant) return field.variant;
  return field.link === false ? "text" : "chips";
}

function tagText(value: unknown): string | null {
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

function tagLabel(value: unknown, tag: string): string {
  return typeof value === "string" && value.trim().startsWith("#")
    ? value.trim()
    : `#${tag}`;
}

function badgeText(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  return safeString(value);
}

function isTagValue(key: string, values: readonly unknown[]): boolean {
  if (isTagKey(key)) return true;
  return (
    values.length > 0 &&
    values.every(
      (value) => typeof value === "string" && value.trim().startsWith("#"),
    )
  );
}

function isTagString(key: string, value: string): boolean {
  return isTagKey(key) || value.trim().startsWith("#");
}

function isTagKey(key: string): boolean {
  return key === "tags" || key === "tag";
}

function findPropertyIcon(
  registry: ContentIconRegistry | undefined,
  key: string,
): ContentIcon | undefined {
  if (!registry?.properties) return undefined;
  if (registry.properties[key]) return registry.properties[key];
  const lower = key.toLowerCase();
  for (const [candidate, icon] of Object.entries(registry.properties)) {
    if (candidate.toLowerCase() === lower) return icon;
  }
  return undefined;
}

function report(
  state: ConversionState,
  key: string,
  value: unknown,
  reason: string,
): void {
  const message: PropertiesMessage = {
    reason: `Property \`${key}\` could not be rendered (${reason}); rendered as escaped text.`,
    propertyKey: key,
    value,
  };
  state.context.onMessage?.(message);
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return String(value);
  if (typeof value === "object" && value !== null) {
    return Object.prototype.toString.call(value);
  }
  return String(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
