import {
  type ContentManifest,
  isPublished,
  type ResolvedRiebeckiteConfig,
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
 * in a snippet. Only `sourceUrl` / `sourceTitle` are gated by `isPublished`,
 * so an unpublished note never leaks its permalink or title. The note body is
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

  for (const entry of args.manifest.entries) {
    if (!isDailyNoteSlug(entry.slug, directory, pathPattern)) continue;

    const snippet = extractDailyNoteSnippet(entry, extract);
    if (snippet === null) continue;

    const published = isPublished(args.config, entry.frontmatter);

    notes.push({
      date: resolveDailyNoteDate(entry),
      snippet,
      slug: entry.slug,
      sourceUrl: published ? entry.permalink : null,
      sourceTitle: published ? entry.title : null,
    });
  }

  return notes.toSorted(compareDailyNotes).slice(0, limit);
}
