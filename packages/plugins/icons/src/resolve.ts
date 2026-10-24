import type {
  ConfigValidationIssue,
  ContentIcon,
  ContentManifestEntry,
} from "@riebeckite/core";
import { normalizeColor } from "./color.js";
import { isEmoji, lookupEmoji } from "./emoji.js";
import {
  type IconicDiagnosticReporter,
  resolveIconic,
  resolveIconicReference,
} from "./iconic.js";
import { parseIconReference, resolveIconize } from "./iconize.js";
import { IconRenderer } from "./render.js";
import {
  type LoadedIconsSettings,
  normalizeIconName,
  normalizeVaultPath,
} from "./settings.js";
import type {
  IconOverride,
  IconPrecedence,
  IconSource,
  IconsOptions,
  IconTarget,
  ResolvedIconsOptions,
} from "./types.js";

const DEFAULT_PRECEDENCE: readonly IconPrecedence[] = [
  "config",
  "frontmatter",
  "iconic",
  "iconize",
];
const SOURCES = new Set<IconSource>(["iconize", "iconic"]);
const PRECEDENCE = new Set<IconPrecedence>([
  "config",
  "frontmatter",
  "iconic",
  "iconize",
]);

export function resolveIconsOptions(
  options: IconsOptions | undefined,
): ResolvedIconsOptions {
  const sources: readonly IconSource[] = options?.sources?.length
    ? [...new Set(options.sources)]
    : ["iconize", "iconic"];
  const precedence = options?.precedence?.length
    ? [...new Set(options.precedence)]
    : [...DEFAULT_PRECEDENCE];
  return {
    sources,
    inline: options?.inline !== false,
    frontmatter: options?.frontmatter !== false,
    colors: options?.colors !== false,
    precedence,
    overrides: options?.overrides ?? {},
    ...(options?.vaultRoot === undefined
      ? {}
      : { vaultRoot: options.vaultRoot }),
    ...(options?.vaultPrefix === undefined
      ? {}
      : { vaultPrefix: options.vaultPrefix }),
    iconize: {
      enabled:
        sources.includes("iconize") && options?.iconize?.enabled !== false,
      ...(options?.iconize?.dataFile === undefined
        ? {}
        : { dataFile: options.iconize.dataFile }),
      ...(options?.iconize?.iconPacks === undefined
        ? {}
        : { iconPacks: options.iconize.iconPacks }),
    },
    iconic: {
      enabled: sources.includes("iconic") && options?.iconic?.enabled !== false,
      ...(options?.iconic?.dataFile === undefined
        ? {}
        : { dataFile: options.iconic.dataFile }),
    },
  };
}

export function validateIconsOptions(
  options: IconsOptions | undefined,
): readonly ConfigValidationIssue[] | undefined {
  if (options === undefined) return undefined;
  const issues: ConfigValidationIssue[] = [];
  if (options.sources !== undefined) {
    if (!Array.isArray(options.sources) || options.sources.length === 0) {
      issues.push({ path: "sources", message: "must be a non-empty array." });
    } else {
      const seen = new Set<string>();
      options.sources.forEach((source, index) => {
        if (!SOURCES.has(source)) {
          issues.push({
            path: `sources[${index}]`,
            message: `unknown source "${String(source)}".`,
          });
        } else if (seen.has(source)) {
          issues.push({
            path: `sources[${index}]`,
            message: `duplicate source "${source}".`,
          });
        }
        seen.add(source);
      });
    }
  }
  if (options.precedence !== undefined) {
    if (!Array.isArray(options.precedence) || options.precedence.length === 0) {
      issues.push({
        path: "precedence",
        message: "must be a non-empty array.",
      });
    } else {
      const seen = new Set<string>();
      options.precedence.forEach((source, index) => {
        if (!PRECEDENCE.has(source)) {
          issues.push({
            path: `precedence[${index}]`,
            message: `unknown precedence "${String(source)}".`,
          });
        } else if (seen.has(source)) {
          issues.push({
            path: `precedence[${index}]`,
            message: `duplicate precedence "${source}".`,
          });
        }
        seen.add(source);
      });
    }
  }
  for (const key of ["inline", "frontmatter", "colors"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "must be a boolean." });
    }
  }
  if (options.overrides !== undefined) {
    if (!isRecord(options.overrides)) {
      issues.push({ path: "overrides", message: "must be an object." });
    } else {
      for (const [key, value] of Object.entries(options.overrides)) {
        if (typeof value === "string") continue;
        if (
          !isRecord(value) ||
          typeof value.icon !== "string" ||
          (value.color !== undefined && typeof value.color !== "string")
        ) {
          issues.push({
            path: `overrides.${key}`,
            message: "must be a string or an object with an icon string.",
          });
        }
      }
    }
  }
  for (const key of ["vaultRoot", "vaultPrefix"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "string") {
      issues.push({ path: key, message: "must be a string." });
    }
  }
  for (const key of ["iconize", "iconic"] as const) {
    const value = options[key];
    if (value !== undefined && !isRecord(value)) {
      issues.push({ path: key, message: "must be an object." });
    }
  }
  return issues.length > 0 ? issues : undefined;
}

export type IconResolver = {
  readonly identifier: string;
  forEntry(entry: ContentManifestEntry): ContentIcon | undefined;
  forFolder(folder: string): ContentIcon | undefined;
  forTag(tag: string): ContentIcon | undefined;
  forProperty(property: string): ContentIcon | undefined;
  inline(name: string): ContentIcon | undefined;
  warnings(): readonly string[];
};

export function createIconResolver(input: {
  readonly settings: LoadedIconsSettings;
  readonly options: ResolvedIconsOptions;
  readonly reportRule: IconicDiagnosticReporter;
}): IconResolver {
  const { settings, options } = input;
  const renderer = new IconRenderer(settings);
  const warnings: string[] = [];
  const iconizeSettings = settings.iconize?.settings;
  const identifier = iconizeSettings?.iconIdentifier ?? ":";
  const packNames = [...settings.iconPacks.keys()];

  const reportUnknown = (reference: string): void => {
    warnings.push(`Icon "${reference}" could not be rendered.`);
  };

  const render = (
    reference: string,
    source: IconPrecedence,
    target: string,
    color: string | undefined,
  ): ContentIcon | undefined => {
    const icon = renderer.render(reference, {
      source,
      target,
      ...(color === undefined ? {} : { color }),
    });
    if (!icon) reportUnknown(reference);
    return icon;
  };

  const fromOverride = (target: IconTarget): ContentIcon | undefined => {
    const override = findOverride(options.overrides, target);
    if (override === undefined) return undefined;
    const value = typeof override === "string" ? { icon: override } : override;
    const reference = parseIconReference(value.icon, packNames);
    if (!reference) return undefined;
    const color = options.colors
      ? normalizeColor(value.color, { iconicNames: true })
      : undefined;
    return render(reference, "config", target.path, color);
  };

  const fromFrontmatter = (target: IconTarget): ContentIcon | undefined => {
    if (!options.frontmatter || target.kind !== "file" || !target.frontmatter) {
      return undefined;
    }
    const iconField = iconizeSettings?.iconInFrontmatterFieldName ?? "icon";
    const colorField =
      iconizeSettings?.iconColorInFrontmatterFieldName ?? "iconColor";
    const raw = target.frontmatter[iconField];
    const iconValue = typeof raw === "string" ? raw.trim() : "";
    if (!iconValue) return undefined;
    const reference = parseIconReference(iconValue, packNames);
    if (!reference) return undefined;
    const rawColor = target.frontmatter[colorField];
    const color = options.colors
      ? (normalizeColor(typeof rawColor === "string" ? rawColor : undefined, {
          iconicNames: true,
        }) ?? normalizeColor(iconizeSettings?.iconColor))
      : undefined;
    return render(reference, "frontmatter", target.path, color);
  };

  const fromIconic = (target: IconTarget): ContentIcon | undefined => {
    if (!options.iconic.enabled || !settings.iconic) return undefined;
    const resolution = resolveIconic(settings.iconic, target, {
      colors: options.colors,
      report: input.reportRule,
    });
    if (!resolution?.icon) return undefined;
    return render(
      resolveIconicReference(resolution.icon),
      "iconic",
      target.path,
      resolution.color,
    );
  };

  const fromIconize = (target: IconTarget): ContentIcon | undefined => {
    if (!options.iconize.enabled || !settings.iconize) return undefined;
    const resolution = resolveIconize(settings.iconize, target, {
      colors: options.colors,
      packs: settings.iconPacks,
    });
    if (!resolution) return undefined;
    return render(resolution.icon, "iconize", target.path, resolution.color);
  };

  const forTarget = (target: IconTarget): ContentIcon | undefined => {
    for (const source of options.precedence) {
      if (source === "config") {
        const icon = fromOverride(target);
        if (icon) return icon;
      } else if (source === "frontmatter") {
        const icon = fromFrontmatter(target);
        if (icon) return icon;
      } else if (source === "iconic") {
        const icon = fromIconic(target);
        if (icon) return icon;
      } else if (source === "iconize") {
        const icon = fromIconize(target);
        if (icon) return icon;
      }
    }
    return undefined;
  };

  return {
    identifier,
    forEntry(entry) {
      return forTarget(targetForEntry(entry, settings.vaultPrefix));
    },
    forFolder(folder) {
      return forTarget(iconTarget("folder", folder, settings.vaultPrefix));
    },
    forTag(tag) {
      if (!options.iconic.enabled || !settings.iconic) return undefined;
      const value = findKey(settings.iconic.tagIcons, tag.replace(/^#/, ""));
      if (!value) return undefined;
      return fromNamedValue(value, `tag:${tag}`, "iconic");
    },
    forProperty(property) {
      if (!options.iconic.enabled || !settings.iconic) return undefined;
      const value = findKey(settings.iconic.propertyIcons, property);
      if (!value) return undefined;
      return fromNamedValue(value, `property:${property}`, "iconic");
    },
    inline(name) {
      if (!options.inline || iconizeSettings?.iconsInNotesEnabled === false) {
        return undefined;
      }
      if (name.includes(":")) return undefined;
      const emoji = lookupEmoji(name) ?? (isEmoji(name) ? name : undefined);
      const color = options.colors
        ? normalizeColor(iconizeSettings?.iconColor)
        : undefined;
      if (emoji) {
        return render(`emoji:${emoji}`, "iconize", `inline:${name}`, color);
      }
      const lucideType = iconizeSettings?.lucideIconPackType ?? "native";
      const normalized = normalizeIconName(name);
      const packReference = packNames.length
        ? parseIconReference(normalized, packNames)
        : undefined;
      if (packReference?.startsWith("pack:")) {
        return render(packReference, "iconize", `inline:${name}`, color);
      }
      if (lucideType === "none") return undefined;
      const reference = `lucide:${toKebabName(name)}`;
      return render(reference, "iconize", `inline:${name}`, color);
    },
    warnings() {
      return warnings;
    },
  };

  function fromNamedValue(
    value: { icon?: string; color?: string },
    target: string,
    source: IconPrecedence,
  ): ContentIcon | undefined {
    if (!value.icon) return undefined;
    const color = options.colors
      ? normalizeColor(value.color, { iconicNames: true })
      : undefined;
    return render(resolveIconicReference(value.icon), source, target, color);
  }
}

function targetForEntry(
  entry: ContentManifestEntry,
  vaultPrefix: string,
): IconTarget {
  const frontmatter = entry.frontmatter as Readonly<Record<string, unknown>>;
  const links = entry.links.map((link) => link.raw);
  return {
    kind: "file",
    path: vaultPath(vaultPrefix, `${entry.slug}.md`),
    slug: entry.slug,
    frontmatter,
    tags: entry.tags,
    links,
    embeds: entry.links.filter((link) => link.embed).map((link) => link.raw),
    ...(entry.file?.ctime ? { created: entry.file.ctime } : {}),
    ...(entry.file?.mtime ? { modified: entry.file.mtime } : {}),
  };
}

function iconTarget(
  kind: IconTarget["kind"],
  value: string,
  vaultPrefix: string,
): IconTarget {
  return {
    kind,
    path: vaultPath(vaultPrefix, value),
    slug: value,
  };
}

function vaultPath(prefix: string, value: string): string {
  return normalizeVaultPath(`${prefix}${value}`) ?? value;
}

function findOverride(
  overrides: Readonly<Record<string, IconOverride>>,
  target: IconTarget,
): IconOverride | undefined {
  const candidates = new Set([
    target.path,
    target.slug,
    target.path.replace(/\.md$/, ""),
  ]);
  for (const [key, value] of Object.entries(overrides)) {
    const normalized = normalizeVaultPath(key);
    if (!normalized) continue;
    if (candidates.has(normalized)) return value;
    if (candidates.has(normalized.replace(/\.md$/, ""))) return value;
    if (normalized.startsWith("./") && candidates.has(normalized.slice(2))) {
      return value;
    }
  }
  return undefined;
}

function findKey<T>(
  values: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  if (values[key] !== undefined) return values[key];
  const lower = key.toLowerCase();
  for (const [candidate, value] of Object.entries(values)) {
    if (candidate.toLowerCase() === lower) return value;
  }
  return undefined;
}

function toKebabName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
