import {
  appendContentBodySlot,
  type ConfigValidationIssue,
  type ContentManifestEntry,
  createStyleAsset,
  definePlugin,
  type PluginManifestContext,
} from "@riebeckite/core";
import {
  buildNoteChangeHistory,
  buildSiteChangelog,
  resolveContentFilePath,
  resolveLookbackSince,
} from "./src/changelog.js";
import { GitChangelogReader } from "./src/git/history_reader.js";
import type { RepositoryPathsResolution } from "./src/git/repo_paths.js";
import { isRepositoryUnavailable } from "./src/git/repo_paths.js";
import { resolveChangelogOptions } from "./src/options.js";
import {
  CHANGELOG_NOTE_ATTRIBUTE,
  CHANGELOG_SITE_ATTRIBUTE,
  renderNoteChangeHistory,
  renderSiteChangelog,
} from "./src/render.js";
import type {
  ChangelogOptions,
  ResolvedChangelogOptions,
} from "./src/types.js";

export {
  buildNoteChangeHistory,
  buildSiteChangelog,
  filterChangelogCommits,
  formatChangelogDate,
  resolveContentFilePath,
  resolveLookbackSince,
} from "./src/changelog.js";
export {
  GitChangelogReader,
  type GitLogWindow,
} from "./src/git/history_reader.js";
export {
  DEFAULT_CHANGELOG_CLASS_NAME,
  DEFAULT_CHANGELOG_HEADING,
  DEFAULT_CHANGELOG_LOCALE,
  DEFAULT_CHANGELOG_MAX_PER_NOTE,
  DEFAULT_CHANGELOG_MAX_SITE_WIDE,
  DEFAULT_CHANGELOG_PER_NOTE_HEADING,
  DEFAULT_CHANGELOG_SITE_WIDE_HEADING,
  DEFAULT_CHANGELOG_SITE_WIDE_SLUG,
  resolveChangelogOptions,
} from "./src/options.js";
export {
  CHANGELOG_NOTE_ATTRIBUTE,
  CHANGELOG_SITE_ATTRIBUTE,
  renderNoteChangeHistory,
  renderSiteChangelog,
} from "./src/render.js";
export type {
  ChangelogCommit,
  ChangelogDateFormat,
  ChangelogOptions,
  ChangelogRecord,
  GitChangelogReaderOptions,
  NoteChangeHistory,
  ResolvedChangelogOptions,
  SiteChangelog,
  SiteChangelogEntry,
  SiteChangelogNote,
} from "./src/types.js";

export const CHANGELOG_PLUGIN_NAME = "changelog";

/** Site layout slot the generated history is written to. */
export const CHANGELOG_BODY_SLOT = "article.after-content";

const PER_NOTE_CONCURRENCY = 4;

/**
 * Git-backed change history for Riebeckite sites.
 *
 * At build time the plugin reads local Git history and publishes HTML
 * fragments through the manifest `bodySlots` mechanism:
 *
 * - every public note gets its own "change history" section;
 * - optionally, a designated note gets the site-wide changelog.
 *
 * The plugin never creates a route. The Site owns the note and the layout; the
 * plugin only fills the `article.after-content` slot. The same dataset is also
 * exported (`buildSiteChangelog`, `renderSiteChangelog`) so a Site can render
 * it from its own route. No client JavaScript is required.
 *
 * When Git is unavailable the build is left untouched and a warning diagnostic
 * is reported instead of failing.
 */
export function changelog(options: ChangelogOptions = {}) {
  const resolved = resolveChangelogOptions(options);

  return definePlugin({
    name: CHANGELOG_PLUGIN_NAME,
    options,
    validateOptions: validateChangelogOptions,
    onManifestCreated: (context) => applyChangelog(context, resolved),
    assets: [createStyleAsset(CHANGELOG_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const changelogPlugin = changelog;

async function applyChangelog(
  context: PluginManifestContext,
  options: ResolvedChangelogOptions,
): Promise<void> {
  if (!options.perNote && !options.siteWide) return;

  const reader = new GitChangelogReader({
    cwd: resolveContentRoot(context, options),
  });
  const resolution = await reader.resolveRepository();
  if (isRepositoryUnavailable(resolution)) {
    reportRepositoryUnavailable(context, resolution);
    return;
  }

  const since = resolveLookbackSince(options.lookbackDays);

  if (options.perNote) {
    await forEachWithConcurrency(
      context.manifest.publicEntries,
      PER_NOTE_CONCURRENCY,
      async (entry) => {
        // The site-wide target is a changelog page, not a regular note.
        if (options.siteWide && entry.slug === options.siteWideSlug) return;
        await applyNoteHistory(context, options, reader, entry, since);
      },
    );
  }

  if (options.siteWide) {
    await applySiteChangelog(context, options, reader, since);
  }
}

async function applyNoteHistory(
  context: PluginManifestContext,
  options: ResolvedChangelogOptions,
  reader: GitChangelogReader,
  entry: ContentManifestEntry,
  since: string | undefined,
): Promise<void> {
  if (hasSlot(entry, CHANGELOG_NOTE_ATTRIBUTE)) return;

  const filePath = resolveEntryFilePath(entry, context.manifest.contentIndex);
  const commits = await reader.getFileHistory(filePath, { since });
  const history = buildNoteChangeHistory(entry, commits, options);
  const html = renderNoteChangeHistory(history, options);
  if (html) appendContentBodySlot(entry, CHANGELOG_BODY_SLOT, html);
}

async function applySiteChangelog(
  context: PluginManifestContext,
  options: ResolvedChangelogOptions,
  reader: GitChangelogReader,
  since: string | undefined,
): Promise<void> {
  const target = context.manifest.publicEntries.find(
    (entry) => entry.slug === options.siteWideSlug,
  );
  if (!target) {
    context.diagnostics.push({
      code: "changelog-target-missing",
      severity: "warning",
      pluginName: CHANGELOG_PLUGIN_NAME,
      message: `changelog: the site-wide target note "${options.siteWideSlug}" was not found; the site-wide changelog was skipped.`,
      suggestion: `Create a public note with slug "${options.siteWideSlug}" or set siteWideSlug to an existing note.`,
    });
    return;
  }

  if (hasSlot(target, CHANGELOG_SITE_ATTRIBUTE)) return;

  const commits = await reader.getRecentCommits({ since });
  const changelog = buildSiteChangelog({
    entries: context.manifest.publicEntries,
    commits,
    contentIndex: context.manifest.contentIndex,
    options,
  });
  const html = renderSiteChangelog(changelog, options);
  if (html) appendContentBodySlot(target, CHANGELOG_BODY_SLOT, html);
}

function resolveEntryFilePath(
  entry: ContentManifestEntry,
  contentIndex: Map<string, string>,
): string {
  return resolveContentFilePath(contentIndex, entry.slug) ?? `${entry.slug}.md`;
}

function hasSlot(entry: ContentManifestEntry, attribute: string): boolean {
  return entry.bodySlots?.[CHANGELOG_BODY_SLOT]?.includes(attribute) ?? false;
}

/**
 * Content root the plugin locates Git from.
 *
 * The configured content directory wins over the process working directory:
 * in a monorepo build the working directory is the app folder, which is not
 * the directory holding the notes.
 */
function resolveContentRoot(
  context: PluginManifestContext,
  options: ResolvedChangelogOptions,
): string {
  return options.cwd ?? context.config?.content.directory ?? process.cwd();
}

function reportRepositoryUnavailable(
  context: PluginManifestContext,
  resolution: Exclude<RepositoryPathsResolution, { kind: "resolved" }>,
): void {
  const gitUnavailable = resolution.kind === "git-unavailable";
  const message = gitUnavailable
    ? `changelog: Git could not be started; change history was skipped. (${resolution.detail})`
    : `changelog: the content directory is not inside a Git working tree; change history was skipped. (${resolution.detail})`;

  context.diagnostics.push({
    code: gitUnavailable
      ? "changelog-git-unavailable"
      : "changelog-content-outside-repository",
    severity: "warning",
    pluginName: CHANGELOG_PLUGIN_NAME,
    message,
    suggestion: gitUnavailable
      ? "Install Git and make sure it is available on PATH."
      : "Move the content directory inside a Git working tree, or set the plugin's cwd option to a path inside one.",
  });
  context.logger.warn(message);
}

async function forEachWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await work(current);
      }
    },
  );
  await Promise.all(workers);
}

function validateChangelogOptions(
  options: ChangelogOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  const assertNonEmptyString = (key: keyof ChangelogOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  };
  const assertBoolean = (key: keyof ChangelogOptions): void => {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  };
  const assertNonNegativeInteger = (key: keyof ChangelogOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    ) {
      issues.push({
        path: key,
        message: "Expected a non-negative integer.",
      });
    }
  };

  for (const key of [
    "cwd",
    "locale",
    "siteWideSlug",
    "perNoteHeading",
    "siteWideHeading",
    "className",
  ] as const) {
    assertNonEmptyString(key);
  }
  for (const key of ["perNote", "siteWide", "showAuthor", "heading"] as const) {
    assertBoolean(key);
  }
  for (const key of ["lookbackDays", "maxPerNote", "maxSiteWide"] as const) {
    assertNonNegativeInteger(key);
  }

  if (
    options.dateFormat !== undefined &&
    options.dateFormat !== "iso" &&
    options.dateFormat !== "long" &&
    options.dateFormat !== "short"
  ) {
    issues.push({
      path: "dateFormat",
      message: 'Expected "iso", "long", or "short".',
    });
  }

  return issues;
}
