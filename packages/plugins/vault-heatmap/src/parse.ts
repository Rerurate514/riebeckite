import { matter } from "vfile-matter";
import { dateKey } from "./activity.js";
import type {
  VaultHeatmapParseResult,
  VaultHeatmapSpec,
  VaultHeatmapWeekStart,
} from "./types.js";

class VaultHeatmapParseError extends Error {}

export type VaultHeatmapDefaults = {
  readonly weeks: number;
  readonly title: string;
  readonly weekStart: VaultHeatmapWeekStart;
};

export function parseVaultHeatmap(
  source: string,
  defaults: VaultHeatmapDefaults,
): VaultHeatmapParseResult {
  try {
    const root = parseMapping(source);
    const spec: VaultHeatmapSpec = {
      weeks: parseWeeks(root.weeks, defaults.weeks),
      title: readString(root.title) ?? defaults.title,
      weekStart: parseWeekStart(root.weekStart, defaults.weekStart),
      ...(root.end === undefined || root.end === null
        ? {}
        : { end: parseEnd(root.end) }),
    };
    return { ok: true, spec };
  } catch (error) {
    if (error instanceof VaultHeatmapParseError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}

function parseMapping(source: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = parseYamlMapping(source);
  } catch (error) {
    throw new VaultHeatmapParseError(
      `is not valid YAML (${formatError(error)}).`,
    );
  }
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new VaultHeatmapParseError("must be a YAML mapping.");
  }
  return parsed as Record<string, unknown>;
}

function parseWeeks(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 104
  ) {
    throw new VaultHeatmapParseError(
      "`weeks` must be an integer between 1 and 104.",
    );
  }
  return value;
}

function parseWeekStart(
  value: unknown,
  fallback: VaultHeatmapWeekStart,
): VaultHeatmapWeekStart {
  if (value === undefined || value === null) return fallback;
  if (value === "sunday" || value === "monday") return value;
  throw new VaultHeatmapParseError('`weekStart` must be "sunday" or "monday".');
}

function parseEnd(value: unknown): string {
  const end = dateKey(value);
  if (!end) {
    throw new VaultHeatmapParseError(
      "`end` must be a calendar date such as 2026-11-01.",
    );
  }
  return end;
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function parseYamlMapping(source: string): unknown {
  const document = `---\n${source}\n---\n`;
  const file = {
    value: document,
    data: {} as Record<string, unknown>,
    toString: () => document,
  };
  matter(file as unknown as Parameters<typeof matter>[0]);
  return file.data.matter;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
