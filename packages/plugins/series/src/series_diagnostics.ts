import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import {
  hasFrontmatterKey,
  readSeriesName,
  readSeriesOrder,
} from "./series_index.js";
import { resolveSeriesOptions } from "./series_options.js";
import type { SeriesOptions } from "./types.js";

/**
 * Reports notes whose series metadata cannot be ordered reliably. Emitted
 * diagnostics use `pluginName: "series"` and `severity: "warning"`.
 */
export function collectSeriesDiagnostics(
  manifest: ContentManifest,
  options: SeriesOptions = {},
): Diagnostic[] {
  const resolved = resolveSeriesOptions(options);
  const diagnostics: Diagnostic[] = [];
  const firstByOrder = new Map<string, ContentManifestEntry>();

  for (const entry of manifest.entries) {
    if (!hasFrontmatterKey(entry, resolved.key)) continue;

    const name = readSeriesName(entry, resolved.key);
    if (!name) {
      diagnostics.push({
        code: "series-invalid-name",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Frontmatter \`${resolved.key}\` must be a non-empty string.`,
      });
      continue;
    }

    const order = readSeriesOrder(entry, resolved.orderKey);
    if (order === undefined) {
      diagnostics.push({
        code: "series-missing-order",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Note in series \`${name}\` has no numeric \`${resolved.orderKey}\`; it is ordered by date, title, then slug.`,
        meta: { series: name },
      });
      continue;
    }

    const orderKey = `${name}\u0000${order}`;
    const first = firstByOrder.get(orderKey);
    if (first) {
      diagnostics.push({
        code: "series-duplicate-order",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Series \`${name}\` has more than one note with \`${resolved.orderKey}: ${order}\` (also in \`${first.slug}\`).`,
        meta: { series: name, order },
      });
    } else {
      firstByOrder.set(orderKey, entry);
    }
  }

  return diagnostics;
}
