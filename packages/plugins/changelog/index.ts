import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import type { ChangelogOptions } from "./src/types.js";

export type { ChangelogProps } from "./components/changelog.js";
export { default as Changelog } from "./components/changelog.js";
export {
  buildNoteChangeHistory,
  buildSiteChangelog,
  filterChangelogCommits,
  formatChangelogDate,
  resolveContentFilePath,
  resolveLookbackSince,
} from "./src/changelog.js";
export type { ChangelogHistoryLoader } from "./src/component-data.js";
export { getChangelog } from "./src/component-data.js";
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

/**
 * Git-backed change history for Riebeckite sites.
 *
 * The plugin exposes data helpers and components the Site composes directly:
 *
 * - `getChangelog` / `Changelog` render a note's own "change history" section;
 * - `buildSiteChangelog` / `renderSiteChangelog` render the site-wide changelog
 *   for a designated note.
 *
 * The plugin never creates a route. The Site owns the note and the layout, and
 * decides where the sections appear. No client JavaScript is required.
 *
 * When Git is unavailable the build is left untouched and a warning diagnostic
 * is reported instead of failing.
 */
export function changelog(options: ChangelogOptions = {}) {
  return definePlugin({
    name: CHANGELOG_PLUGIN_NAME,
    options,
    validateOptions: validateChangelogOptions,
    assets: [
      createStyleAsset(
        CHANGELOG_PLUGIN_NAME,
        "@riebeckite/plugin-changelog/style.css",
      ),
    ],
  });
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
