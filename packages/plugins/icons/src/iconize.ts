import { normalizeColor } from "./color.js";
import { isEmoji } from "./emoji.js";
import { type IconPacks, normalizeIconName } from "./settings.js";
import type {
  IconizeData,
  IconizeRule,
  IconizeValue,
  IconTarget,
} from "./types.js";

type IconizeResolution = {
  readonly icon: string;
  readonly color?: string;
};

export function resolveIconize(
  data: IconizeData,
  target: IconTarget,
  options: {
    readonly colors: boolean;
    readonly packs: IconPacks;
  },
): IconizeResolution | undefined {
  const direct = data.icons.get(target.path);
  if (direct?.iconName) {
    return toResolution(direct, data, options);
  }

  const rule = firstMatchingRule(data.settings.rules, target);
  if (!rule) return undefined;
  return toResolution(
    { iconName: rule.icon, ...(rule.color ? { iconColor: rule.color } : {}) },
    data,
    options,
  );
}

export function parseIconReference(
  value: string,
  packNames: Iterable<string>,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isEmoji(trimmed)) return `emoji:${trimmed}`;

  const lower = trimmed.toLowerCase();
  const packs = [...packNames]
    .map((name) => normalizeIconName(name))
    .filter(Boolean)
    .toSorted((a, b) => b.length - a.length);
  for (const pack of packs) {
    if (lower.startsWith(pack.toLowerCase()) && trimmed.length > pack.length) {
      return `pack:${pack}:${trimmed.slice(pack.length)}`;
    }
  }

  if (/^Li[A-Z0-9]/.test(trimmed)) {
    return `lucide:${toKebab(trimmed.slice(2))}`;
  }
  if (lower.startsWith("lucide-")) {
    return `lucide:${lower.slice("lucide-".length)}`;
  }
  if (lower.startsWith("lucide:")) {
    return `lucide:${lower.slice("lucide:".length)}`;
  }
  return `lucide:${toKebab(trimmed)}`;
}

function toKebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toResolution(
  value: IconizeValue,
  data: IconizeData,
  options: {
    readonly colors: boolean;
    readonly packs: IconPacks;
  },
): IconizeResolution | undefined {
  if (!value.iconName) return undefined;
  const icon = parseIconReference(value.iconName, options.packs.keys());
  if (!icon) return undefined;
  const color = options.colors
    ? (normalizeColor(value.iconColor) ??
      normalizeColor(data.settings.iconColor))
    : undefined;
  return { icon, ...(color ? { color } : {}) };
}

function firstMatchingRule(
  rules: readonly IconizeRule[],
  target: IconTarget,
): IconizeRule | undefined {
  const sorted = rules.toSorted((a, b) => a.order - b.order);
  for (const rule of sorted) {
    if (rule.for === "files" && target.kind !== "file") continue;
    if (rule.for === "folders" && target.kind !== "folder") continue;
    const subject = rule.useFilePath
      ? target.path
      : (target.path.split("/").pop() ?? target.path);
    if (matchesRule(rule.rule, subject)) return rule;
  }
  return undefined;
}

function matchesRule(pattern: string, value: string): boolean {
  if (pattern.length > 512) return false;
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return value.includes(pattern);
  }
}
