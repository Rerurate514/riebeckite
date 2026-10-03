import type {
  ContentManifest,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolvePlugins } from "@riebeckite/core";
import {
  compareDailyNotes,
  DAILY_NOTES_PLUGIN_NAME,
  type DailyNote,
  type DailyNotesOptions,
  DEFAULT_DIRECTORY,
  DEFAULT_LIMIT,
  DEFAULT_SLUG_DATE_FORMAT,
  extractDailyNoteSnippet,
  formatDailyNoteDate,
  isDailyNoteSlug,
  resolveDailyNoteDate,
  resolveDisplayOptions,
  resolveExtractOptions,
} from "./daily-notes.js";

/**
 * Reads the daily-notes plugin's options back from a Riebeckite config.
 *
 * The widget is rendered by the host application route rather than the plugin
 * itself, so `getDailyNotes` resolves the registered options here to keep the
 * displayed widget in sync with `dailyNotesPlugin(options)`.
 */
export function resolveDailyNotesOptionsFromConfig(
  config: ResolvedRiebeckiteConfig,
): DailyNotesOptions {
  const plugin = resolvePlugins(config.plugins).find(
    (candidate) => candidate.name === DAILY_NOTES_PLUGIN_NAME,
  );
  return (plugin?.options as DailyNotesOptions | undefined) ?? {};
}

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
  const options =
    args.options ?? resolveDailyNotesOptionsFromConfig(args.config);
  const extract = resolveExtractOptions(options);
  const display = resolveDisplayOptions(options);
  const directory = options?.source?.directory ?? DEFAULT_DIRECTORY;
  const pathPattern = options?.source?.pathPattern;
  const slugDateFormat =
    options?.source?.dateFormat ?? DEFAULT_SLUG_DATE_FORMAT;
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
    const date = resolveDailyNoteDate(entry, slugDateFormat);

    notes.push({
      date,
      dateDisplay: formatDailyNoteDate(date, display),
      snippet,
      slug: entry.slug,
      sourceUrl: discoverable ? entry.permalink : null,
      sourceTitle: discoverable ? entry.title : null,
    });
  }

  return notes.toSorted(compareDailyNotes).slice(0, limit);
}
