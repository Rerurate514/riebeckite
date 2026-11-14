import type { IconDiagnostic } from "./icon_packs.js";
import {
  isRecord,
  nonEmptyString,
  normalizeVaultPath,
} from "./icons_settings_io.js";
import type { IconicData, IconicRule, IconicValue } from "./types.js";

export function parseIconicData(
  raw: unknown,
  diagnostics: IconDiagnostic[],
): IconicData {
  if (!isRecord(raw)) {
    diagnostics.push({
      code: "icons-invalid-settings",
      severity: "warning",
      message: "Iconic settings are not an object; continuing without them.",
      meta: { source: "Iconic" },
    });
    return {
      fileIcons: {},
      tagIcons: {},
      propertyIcons: {},
      fileRules: [],
      folderRules: [],
    };
  }
  return {
    fileIcons: parseIconicValues(raw.fileIcons),
    tagIcons: parseIconicValues(raw.tagIcons),
    propertyIcons: parseIconicValues(raw.propertyIcons),
    fileRules: parseIconicRules(raw.fileRules),
    folderRules: parseIconicRules(raw.folderRules),
  };
}

export function parseIconicValues(value: unknown): Record<string, IconicValue> {
  if (!isRecord(value)) return {};
  const result: Record<string, IconicValue> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    const normalized = key.includes("/") ? normalizeVaultPath(key) : key;
    if (!normalized) continue;
    const icon = nonEmptyString(raw.icon);
    const color = nonEmptyString(raw.color);
    if (!icon && !color) continue;
    result[normalized] = {
      ...(icon ? { icon } : {}),
      ...(color ? { color } : {}),
    };
  }
  return result;
}

export function parseIconicRules(value: unknown): IconicRule[] {
  if (!Array.isArray(value)) return [];
  const rules: IconicRule[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const conditions = Array.isArray(raw.conditions)
      ? raw.conditions.flatMap((condition) => {
          if (!isRecord(condition)) return [];
          return [
            {
              ...(typeof condition.source === "string"
                ? { source: condition.source }
                : {}),
              ...(typeof condition.operator === "string"
                ? { operator: condition.operator }
                : {}),
              ...(typeof condition.value === "string"
                ? { value: condition.value }
                : {}),
            },
          ];
        })
      : [];
    const icon = nonEmptyString(raw.icon);
    const color = nonEmptyString(raw.color);
    rules.push({
      ...(typeof raw.id === "string" ? { id: raw.id } : {}),
      ...(typeof raw.name === "string" ? { name: raw.name } : {}),
      ...(icon ? { icon } : {}),
      ...(color ? { color } : {}),
      ...(raw.match === "any" || raw.match === "none"
        ? { match: raw.match }
        : { match: "all" as const }),
      conditions,
      enabled: raw.enabled === true,
    });
  }
  return rules;
}
