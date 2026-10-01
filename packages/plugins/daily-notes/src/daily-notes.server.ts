import type {
  ContentManifest,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  compareDailyNotes,
  type DailyNote,
  type DailyNotesOptions,
  DEFAULT_DIRECTORY,
  DEFAULT_LIMIT,
  extractDailyNoteSnippet,
  isDailyNoteSlug,
  resolveDailyNoteDate,
  resolveExtractOptions,
} from "./daily-notes.js";

/**
 * Builds the widget view of the Daily Notes collection.
 *
 * Reads `manifest.entries` (the raw view) on purpose: a private note may opt
 * in a snippet. Only `sourceUrl` / `sourceTitle` are exposed for discoverable
 * notes, so hidden notes never leak their permalink or title. The note body is
 * never emitted wholesale — a note without a valid snippet is skipped.
 */
export function getDailyNotes(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  options?: DailyNotesOptions;
}): DailyNote[] {
  const options = args.options;
  const extract = resolveExtractOptions(options);
  const directory = options?.source?.directory ?? DEFAULT_DIRECTORY;
  const pathPattern = options?.source?.pathPattern;
  const limit = Math.max(0, options?.widget?.limit ?? DEFAULT_LIMIT);

  const notes: DailyNote[] = [];
  const discoverableSlugs = new Set(
    args.manifest.discoverableEntries.map((entry) => entry.slug),
  );

  for (const entry of args.manifest.entries) {
    if (!isDailyNoteSlug(entry.slug, directory, pathPattern)) continue;

    const snippet = extractDailyNoteSnippet(entry, extract);
    if (snippet === null) continue;

    const discoverable = discoverableSlugs.has(entry.slug);

    notes.push({
      date: resolveDailyNoteDate(entry),
      snippet,
      slug: entry.slug,
      sourceUrl: discoverable ? entry.permalink : null,
      sourceTitle: discoverable ? entry.title : null,
    });
  }

  return notes.toSorted(compareDailyNotes).slice(0, limit);
}
