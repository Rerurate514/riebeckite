import { parseYaml } from "@riebeckite/core";
import type {
  ImageCompareOrientation,
  ImageCompareParseResult,
  ImageCompareSpec,
} from "./types.js";

class ImageCompareParseError extends Error {}

export function parseImageCompare(source: string): ImageCompareParseResult {
  try {
    return parseImageCompareSpec(parseMapping(source));
  } catch (error) {
    if (error instanceof ImageCompareParseError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}

export function parseImageCompareSpec(
  value: Record<string, unknown>,
): ImageCompareParseResult {
  try {
    const before = readString(value.before);
    const after = readString(value.after);
    if (!before) {
      throw new ImageCompareParseError("must define a `before` image.");
    }
    if (!after) {
      throw new ImageCompareParseError("must define an `after` image.");
    }

    const orientation = parseOrientation(value.orientation);
    const label = readString(value.label);
    const spec: ImageCompareSpec = {
      before,
      after,
      beforeAlt: readString(value.beforeAlt) ?? "Before",
      afterAlt: readString(value.afterAlt) ?? "After",
      orientation,
      ...(label ? { label } : {}),
    };
    return { ok: true, spec };
  } catch (error) {
    if (error instanceof ImageCompareParseError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}

function parseMapping(source: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = parseYaml(source);
  } catch (error) {
    throw new ImageCompareParseError(
      `is not valid YAML (${formatError(error)}).`,
    );
  }
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ImageCompareParseError("must be a YAML mapping.");
  }
  return parsed as Record<string, unknown>;
}

function parseOrientation(value: unknown): ImageCompareOrientation {
  if (value === undefined || value === null) return "horizontal";
  if (value === "horizontal" || value === "vertical") return value;
  throw new ImageCompareParseError(
    '`orientation` must be "horizontal" or "vertical".',
  );
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
