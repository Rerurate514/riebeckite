import { promises as fs } from "node:fs";
import path from "node:path";
import {
  fingerprintExternalValue,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  type IconDiagnostic,
  type IconPackFile,
  type IconPacks,
  loadIconPacks,
  normalizeIconName,
} from "./icon_packs.js";
import type {
  IconicData,
  IconicRule,
  IconicValue,
  IconizeData,
  IconizeRule,
  IconizeSettings,
  IconizeValue,
  ResolvedIconsOptions,
} from "./types.js";

const ICONIZE_ID = "obsidian-icon-folder";
const ICONIC_ID = "iconic";
const MAX_SETTINGS_BYTES = 2 * 1024 * 1024;

export type { IconPacks } from "./icon_packs.js";
export { normalizeIconName } from "./icon_packs.js";

export type LoadedIconsSettings = {
  readonly iconize?: IconizeData;
  readonly iconic?: IconicData;
  readonly iconPacks: IconPacks;
  readonly iconPacksRoot?: string;
  readonly vaultPrefix: string;
  readonly fingerprint: string;
  readonly diagnostics: readonly IconDiagnostic[];
};

const DEFAULT_ICONIZE_SETTINGS: IconizeSettings = {
  iconPacksPath: ".obsidian/icons",
  iconColor: null,
  iconInFrontmatterEnabled: false,
  iconInFrontmatterFieldName: "icon",
  iconColorInFrontmatterFieldName: "iconColor",
  iconsInNotesEnabled: true,
  iconInLinksEnabled: true,
  iconIdentifier: ":",
  lucideIconPackType: "native",
  emojiStyle: "native",
  rules: [],
};

export async function loadIconsSettings(
  options: ResolvedIconsOptions,
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<LoadedIconsSettings> {
  const diagnostics: IconDiagnostic[] = [];
  const contentDirectory = config?.content.directory;
  const vaultRoot = await resolveVaultRoot(options, contentDirectory);
  const vaultPrefix = resolveVaultPrefix(options, vaultRoot, contentDirectory);
  const dataRoot = vaultRoot ?? process.cwd();

  let iconize: IconizeData | undefined;
  if (options.iconize.enabled) {
    const dataFile = await resolveDataFile({
      explicit: options.iconize.dataFile,
      pluginId: ICONIZE_ID,
      root: dataRoot,
      vaultRoot,
      diagnostics,
      source: "Iconize",
    });
    if (dataFile) {
      const raw = await readJsonFile(dataFile, "Iconize", diagnostics);
      if (raw !== undefined) iconize = parseIconizeData(raw, diagnostics);
    }
  }

  let iconic: IconicData | undefined;
  if (options.iconic.enabled) {
    const dataFile = await resolveDataFile({
      explicit: options.iconic.dataFile,
      pluginId: ICONIC_ID,
      root: dataRoot,
      vaultRoot,
      diagnostics,
      source: "Iconic",
    });
    if (dataFile) {
      const raw = await readJsonFile(dataFile, "Iconic", diagnostics);
      if (raw !== undefined) iconic = parseIconicData(raw, diagnostics);
    }
  }

  const iconPacksRoot = vaultRoot
    ? resolvePackRoot(
        vaultRoot,
        options.iconize.iconPacks ??
          iconize?.settings.iconPacksPath ??
          DEFAULT_ICONIZE_SETTINGS.iconPacksPath,
      )
    : undefined;
  const iconPacks = iconPacksRoot
    ? await loadIconPacks(iconPacksRoot, diagnostics)
    : new Map();

  return {
    ...(iconize === undefined ? {} : { iconize }),
    ...(iconic === undefined ? {} : { iconic }),
    iconPacks,
    ...(iconPacksRoot === undefined ? {} : { iconPacksRoot }),
    vaultPrefix,
    fingerprint: fingerprintExternalValue({
      iconize: iconize
        ? { settings: iconize.settings, icons: [...iconize.icons] }
        : null,
      iconic: iconic ?? null,
      packs: [...iconPacks].map(([pack, files]) => [
        pack,
        [...files].map(([name, file]) => [name, file.size, file.modified]),
      ]),
    }),
    diagnostics,
  };
}

export function findIconPackFile(
  packs: IconPacks,
  packName: string,
  iconName: string,
): IconPackFile | undefined {
  const pack = packs.get(packName.toLowerCase());
  if (!pack) return undefined;
  return pack.get(normalizeIconName(iconName).toLowerCase());
}

export function normalizeVaultPath(value: string): string | undefined {
  const normalized = value
    .normalize("NFC")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
  if (!normalized || normalized.includes("\0")) return undefined;
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return undefined;
  }
  return segments.filter(Boolean).join("/");
}

async function resolveVaultRoot(
  options: ResolvedIconsOptions,
  contentDirectory: string | undefined,
): Promise<string | undefined> {
  if (options.vaultRoot) {
    const explicit = path.resolve(options.vaultRoot);
    const root =
      path.basename(explicit) === ".obsidian"
        ? path.dirname(explicit)
        : explicit;
    return (await isDirectory(root)) ? root : undefined;
  }

  const starts = [contentDirectory, process.cwd()].filter(
    (value): value is string => typeof value === "string",
  );
  for (const start of starts) {
    let current = path.resolve(start);
    for (;;) {
      if (await isDirectory(path.join(current, ".obsidian"))) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return undefined;
}

function resolveVaultPrefix(
  options: ResolvedIconsOptions,
  vaultRoot: string | undefined,
  contentDirectory: string | undefined,
): string {
  if (options.vaultPrefix !== undefined) {
    return normalizeVaultPath(options.vaultPrefix) ?? "";
  }
  if (!vaultRoot || !contentDirectory) return "";
  const relative = path.relative(vaultRoot, path.resolve(contentDirectory));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return "";
  }
  return `${normalizeVaultPath(relative) ?? ""}/`.replace(/^\/+/, "");
}

async function resolveDataFile(input: {
  explicit?: string;
  pluginId: string;
  root: string;
  vaultRoot?: string;
  diagnostics: IconDiagnostic[];
  source: string;
}): Promise<string | undefined> {
  const root = input.vaultRoot ?? input.root;
  if (input.explicit) {
    const resolved = path.resolve(input.root, input.explicit);
    if (!isWithin(root, resolved)) {
      input.diagnostics.push({
        code: "icons-untrusted-settings-path",
        severity: "warning",
        message: `${input.source} settings path is outside the allowed root; ignoring it.`,
        meta: { source: input.source },
      });
      return undefined;
    }
    return (await isFile(resolved)) ? resolved : undefined;
  }

  const candidate = path.join(
    root,
    ".obsidian",
    "plugins",
    input.pluginId,
    "data.json",
  );
  return (await isFile(candidate)) ? candidate : undefined;
}

async function readJsonFile(
  filePath: string,
  source: string,
  diagnostics: IconDiagnostic[],
): Promise<unknown> {
  const text = await readTextFile(filePath, MAX_SETTINGS_BYTES);
  if (text === undefined) {
    diagnostics.push({
      code: "icons-unreadable-settings",
      severity: "warning",
      message: `${source} settings could not be read; continuing without them.`,
      meta: { source },
    });
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    diagnostics.push({
      code: "icons-invalid-settings",
      severity: "warning",
      message: `${source} settings are not valid JSON; continuing without them.`,
      meta: { source },
    });
    return undefined;
  }
}

async function readTextFile(
  filePath: string,
  maxBytes: number,
): Promise<string | undefined> {
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
    if (stat.size > maxBytes) return undefined;
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function parseIconizeData(
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

function parseIconizeRules(value: unknown): IconizeRule[] {
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

function parseIconicData(
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

function parseIconicValues(value: unknown): Record<string, IconicValue> {
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

function parseIconicRules(value: unknown): IconicRule[] {
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

function resolvePackRoot(vaultRoot: string, value: string): string | undefined {
  const resolved = path.resolve(vaultRoot, value);
  return isWithin(vaultRoot, resolved) ? resolved : undefined;
}

function isLucidePackType(
  value: unknown,
): value is IconizeSettings["lucideIconPackType"] {
  return value === "none" || value === "custom" || value === "native";
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function isDirectory(value: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(value);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function isFile(value: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(value);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}
