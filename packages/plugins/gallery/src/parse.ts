import { matter } from "vfile-matter";
import type { ResolvedGalleryOptions } from "./options.js";
import type {
  GalleryItem,
  GalleryParseResult,
  GallerySpec,
  GalleryWarning,
} from "./types.js";

/**
 * Accepted `aspect` values: a bare number (`1`, `1.5`) or a ratio (`16/9`).
 * The value is interpolated into a `style` attribute, so it is validated
 * strictly to keep arbitrary CSS out of generated markup.
 */
const ASPECT_PATTERN = /^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?$/;

const STRING_FIELDS = [
  "image",
  "alt",
  "title",
  "description",
  "href",
  "meta",
] as const;

class GalleryParseError extends Error {}

/**
 * Parses a `gallery` code block body into a renderable spec.
 *
 * Returns a `reason` clause when the block cannot be rendered at all; the
 * caller reports it as a `gallery-invalid` error and shows an error box.
 */
export function parseGallery(
  source: string,
  options: ResolvedGalleryOptions,
): GalleryParseResult {
  try {
    const root = parseMapping(source);
    const items = parseItems(root.items);
    const columns = parseColumns(root.columns, options.columns);
    const aspect = parseAspect(root.aspect, options.aspect);
    const spec: GallerySpec = { items: items.items, columns, aspect };
    return { ok: true, spec, warnings: items.warnings };
  } catch (error) {
    if (error instanceof GalleryParseError) {
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
    throw new GalleryParseError(`is not valid YAML (${formatError(error)}).`);
  }
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GalleryParseError("must be a YAML mapping.");
  }
  return parsed as Record<string, unknown>;
}

function parseItems(value: unknown): {
  items: GalleryItem[];
  warnings: GalleryWarning[];
} {
  if (!Array.isArray(value)) {
    throw new GalleryParseError("must define an `items` list.");
  }

  const items: GalleryItem[] = [];
  const warnings: GalleryWarning[] = [];
  value.forEach((entry, index) => {
    if (
      entry === null ||
      entry === undefined ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      throw new GalleryParseError(`item ${index + 1} must be a mapping.`);
    }
    const item = parseItem(entry as Record<string, unknown>);
    if (!item.title && !item.image) {
      warnings.push({
        code: "gallery-item-incomplete",
        message: `Gallery item ${index + 1} has neither a title nor an image.`,
      });
    }
    items.push(item);
  });
  return { items, warnings };
}

function parseItem(record: Record<string, unknown>): GalleryItem {
  const item: GalleryItem = {};
  for (const field of STRING_FIELDS) {
    const value = readString(record[field]);
    if (value !== undefined) item[field] = value;
  }
  return item;
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function parseColumns(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new GalleryParseError("`columns` must be a positive integer.");
  }
  return value;
}

function parseAspect(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !ASPECT_PATTERN.test(value.trim())) {
    throw new GalleryParseError('`aspect` must look like "16/9" or "1".');
  }
  return value.trim();
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
