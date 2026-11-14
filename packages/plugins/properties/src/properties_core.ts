import { parsePropertyDate } from "./date.js";
import { convertInline } from "./inline.js";
import { isPlainObject } from "./object.js";
import { setNestedConverter } from "./properties_bridge.js";
import {
  convertBadge,
  convertDate,
  convertLink,
  convertTags,
  convertText,
  convertWikilinks,
  isTagString,
  isTagValue,
} from "./properties_converters.js";
import { formatError, report, safeString } from "./properties_helpers.js";
import type { ConversionState } from "./properties_types.js";
import { MAX_DEPTH } from "./properties_types.js";
import { isEmptyPropertyValue } from "./selection.js";
import type { PropertiesFieldConfig, PropertyValue } from "./types.js";

export function convertValue(
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

setNestedConverter(convertValue);
