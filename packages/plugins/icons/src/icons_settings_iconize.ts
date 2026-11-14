import type { IconDiagnostic } from "./icon_packs.js";
import {
  isRecord,
  nonEmptyString,
  normalizeVaultPath,
} from "./icons_settings_io.js";
import { isLucidePackType } from "./icons_settings_packs.js";
import { DEFAULT_ICONIZE_SETTINGS } from "./icons_settings_types.js";
import type {
  IconizeData,
  IconizeRule,
  IconizeSettings,
  IconizeValue,
} from "./types.js";

export function parseIconizeData(
  raw: unknown,
  diagnostics: IconDiagnostic[],
): IconizeData {
  if (!isRecord(raw)) {
    diagnostics.push({
      code: "icons-invalid-settings",
      severity: "warning",
      message: "Iconize settings are not an object; continuing without them.",
      meta: { source: "Iconize" },
    });
    return { settings: DEFAULT_ICONIZE_SETTINGS, icons: new Map() };
  }

  const rawSettings = isRecord(raw.settings) ? raw.settings : {};
  const iconIdentifier =
    typeof rawSettings.iconIdentifier === "string" &&
    rawSettings.iconIdentifier.length > 0
      ? rawSettings.iconIdentifier
      : DEFAULT_ICONIZE_SETTINGS.iconIdentifier;
  const settings: IconizeSettings = {
    iconPacksPath:
      typeof rawSettings.iconPacksPath === "string" &&
      rawSettings.iconPacksPath.trim()
        ? rawSettings.iconPacksPath
        : DEFAULT_ICONIZE_SETTINGS.iconPacksPath,
    iconColor:
      typeof rawSettings.iconColor === "string" ? rawSettings.iconColor : null,
    iconInFrontmatterEnabled: rawSettings.iconInFrontmatterEnabled === true,
    iconInFrontmatterFieldName:
      nonEmptyString(rawSettings.iconInFrontmatterFieldName) ??
      DEFAULT_ICONIZE_SETTINGS.iconInFrontmatterFieldName,
    iconColorInFrontmatterFieldName:
      nonEmptyString(rawSettings.iconColorInFrontmatterFieldName) ??
      DEFAULT_ICONIZE_SETTINGS.iconColorInFrontmatterFieldName,
    iconsInNotesEnabled: rawSettings.iconsInNotesEnabled !== false,
    iconInLinksEnabled: rawSettings.iconInLinksEnabled !== false,
    iconIdentifier,
    lucideIconPackType: isLucidePackType(rawSettings.lucideIconPackType)
      ? rawSettings.lucideIconPackType
      : DEFAULT_ICONIZE_SETTINGS.lucideIconPackType,
    emojiStyle: rawSettings.emojiStyle === "twemoji" ? "twemoji" : "native",
    rules: parseIconizeRules(rawSettings.rules),
  };

  const icons = new Map<string, IconizeValue>();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "settings" || key === "migrated") continue;
    const normalized = normalizeVaultPath(key);
    if (!normalized) continue;
    if (typeof value === "string") {
      if (value.trim()) icons.set(normalized, { iconName: value.trim() });
      continue;
    }
    if (!isRecord(value)) continue;
    const iconName =
      value.iconName === null
        ? null
        : typeof value.iconName === "string"
          ? value.iconName.trim() || null
          : null;
    const iconColor =
      typeof value.iconColor === "string" ? value.iconColor : undefined;
    if (iconName === null && iconColor === undefined) continue;
    icons.set(normalized, {
      iconName,
      ...(iconColor === undefined ? {} : { iconColor }),
    });
  }

  if (settings.emojiStyle === "twemoji") {
    diagnostics.push({
      code: "icons-unsupported-emoji-style",
      severity: "info",
      message:
        "Iconize twemoji styling is not bundled; native emoji are used instead.",
      meta: { source: "Iconize" },
    });
  }

  return { settings, icons };
}

export function parseIconizeRules(value: unknown): IconizeRule[] {
  if (!Array.isArray(value)) return [];
  const rules: IconizeRule[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const rule = nonEmptyString(raw.rule);
    const icon = nonEmptyString(raw.icon);
    if (!rule || !icon) continue;
    rules.push({
      rule,
      icon,
      order:
        typeof raw.order === "number" && Number.isFinite(raw.order)
          ? raw.order
          : rules.length,
      ...(typeof raw.color === "string" ? { color: raw.color } : {}),
      ...(raw.useFilePath === true ? { useFilePath: true } : {}),
      ...(raw.for === "everything" ||
      raw.for === "files" ||
      raw.for === "folders"
        ? { for: raw.for }
        : {}),
    });
  }
  return rules;
}
