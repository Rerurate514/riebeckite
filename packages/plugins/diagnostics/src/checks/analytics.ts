import type { Diagnostic } from "@riebeckite/core";
import { hasField } from "../frontmatter.js";
import type { ScannedNote, ScanResult } from "../vault.js";
import { type NormalizedOptions, pushDiagnostic } from "./shared.js";

/**
 * Reports published content that the analytics plugin will not track.
 *
 * The analytics browser initializer emits a page view only for entries that
 * carry Core's source-authored stable content ID (`id`, or the compatible
 * `uid`). Content without that ID builds and publishes normally but is silently
 * absent from analytics. This check surfaces that gap as factual, read-only
 * `info` findings; the analytics plugin itself never autofixes content.
 */
export function checkAnalyticsCoverage(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
): void {
  if (!options.reportAnalyticsCoverage) return;
  for (const note of source.includedNotes) {
    if (!note.published || hasAnalyticsId(note)) continue;
    pushDiagnostic(
      diagnostics,
      options,
      { slug: note.slug, filePath: note.relativePath },
      "analytics-untracked",
      "published content has no stable content ID and is not tracked by the analytics plugin",
      note.slug,
      'add "id" to the frontmatter',
    );
  }
}

function hasAnalyticsId(note: ScannedNote): boolean {
  return hasField(note.fm.values, "id") || hasField(note.fm.values, "uid");
}
