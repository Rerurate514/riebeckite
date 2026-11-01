import type { GraphGroup, GraphSettings } from "./types.js";

export const GRAPH_SETTINGS_RANGES = {
  depth: { min: 0, max: 5, step: 1 },
  textFade: { min: 0, max: 1, step: 0.05 },
  nodeSize: { min: 0.5, max: 2.5, step: 0.1 },
  linkThickness: { min: 0.25, max: 3, step: 0.05 },
  centerForce: { min: 0, max: 1, step: 0.05 },
  repelForce: { min: 0, max: 2000, step: 10 },
  linkForce: { min: 0, max: 1, step: 0.05 },
  linkDistance: { min: 30, max: 500, step: 5 },
} as const;

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = Object.freeze({
  search: "",
  showTags: true,
  showAttachments: true,
  existingOnly: false,
  showOrphans: true,
  depth: 2,
  arrows: false,
  textFade: 0.35,
  nodeSize: 1,
  linkThickness: 1,
  animate: false,
  centerForce: 0.35,
  repelForce: 600,
  linkForce: 0.7,
  linkDistance: 100,
  groups: [],
});

const GROUP_COLORS = [
  "#e07a5f",
  "#3d85c6",
  "#6aa84f",
  "#c27ba0",
  "#e6b422",
  "#7c6ee6",
];

const MAX_GROUPS = 24;

export function mergeGraphSettings(
  base: GraphSettings,
  patch: Partial<GraphSettings>,
): GraphSettings {
  return normalizeGraphSettings({ ...base, ...patch });
}

export function normalizeGraphSettings(value: unknown): GraphSettings {
  const source =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    search: text(source.search, DEFAULT_GRAPH_SETTINGS.search, 200),
    showTags: flag(source.showTags, DEFAULT_GRAPH_SETTINGS.showTags),
    showAttachments: flag(
      source.showAttachments,
      DEFAULT_GRAPH_SETTINGS.showAttachments,
    ),
    existingOnly: flag(
      source.existingOnly,
      DEFAULT_GRAPH_SETTINGS.existingOnly,
    ),
    showOrphans: flag(source.showOrphans, DEFAULT_GRAPH_SETTINGS.showOrphans),
    depth: integer(source.depth, "depth", DEFAULT_GRAPH_SETTINGS.depth),
    arrows: flag(source.arrows, DEFAULT_GRAPH_SETTINGS.arrows),
    textFade: number(
      source.textFade,
      "textFade",
      DEFAULT_GRAPH_SETTINGS.textFade,
    ),
    nodeSize: number(
      source.nodeSize,
      "nodeSize",
      DEFAULT_GRAPH_SETTINGS.nodeSize,
    ),
    linkThickness: number(
      source.linkThickness,
      "linkThickness",
      DEFAULT_GRAPH_SETTINGS.linkThickness,
    ),
    animate: flag(source.animate, DEFAULT_GRAPH_SETTINGS.animate),
    centerForce: number(
      source.centerForce,
      "centerForce",
      DEFAULT_GRAPH_SETTINGS.centerForce,
    ),
    repelForce: number(
      source.repelForce,
      "repelForce",
      DEFAULT_GRAPH_SETTINGS.repelForce,
    ),
    linkForce: number(
      source.linkForce,
      "linkForce",
      DEFAULT_GRAPH_SETTINGS.linkForce,
    ),
    linkDistance: number(
      source.linkDistance,
      "linkDistance",
      DEFAULT_GRAPH_SETTINGS.linkDistance,
    ),
    groups: groups(source.groups),
  };
}

export function readStoredGraphSettings(
  storage: { getItem(key: string): string | null },
  key: string,
): GraphSettings | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return normalizeGraphSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredGraphSettings(
  storage: { setItem(key: string, value: string): void },
  key: string,
  settings: GraphSettings,
): void {
  try {
    storage.setItem(key, JSON.stringify(settings));
  } catch {
    return;
  }
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function number(
  value: unknown,
  key: keyof typeof GRAPH_SETTINGS_RANGES,
  fallback: number,
): number {
  const range = GRAPH_SETTINGS_RANGES[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(value, range.min, range.max);
}

function integer(
  value: unknown,
  key: keyof typeof GRAPH_SETTINGS_RANGES,
  fallback: number,
): number {
  return Math.round(number(value, key, fallback));
}

function text(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

function groups(value: unknown): GraphGroup[] {
  if (!Array.isArray(value)) return [];
  const result: GraphGroup[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (result.length >= MAX_GROUPS) break;
    if (item === null || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    if (typeof source.id !== "string" || source.id.length === 0) continue;
    if (seen.has(source.id)) continue;
    const query = text(source.query, "", 200);
    if (query.trim().length === 0) continue;
    seen.add(source.id);
    result.push({
      id: source.id.slice(0, 64),
      query,
      color: color(source.color, result.length),
    });
  }

  return result;
}

function color(value: unknown, index: number): string {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLocaleLowerCase();
  }
  return GROUP_COLORS[index % GROUP_COLORS.length] ?? "#6aa84f";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
