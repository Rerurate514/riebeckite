import type {
  ChangelogDateFormat,
  ChangelogOptions,
  ResolvedChangelogOptions,
} from "./types.js";

export const DEFAULT_CHANGELOG_DATE_FORMAT: ChangelogDateFormat = "iso";
export const DEFAULT_CHANGELOG_LOCALE = "en";
export const DEFAULT_CHANGELOG_PER_NOTE = true;
export const DEFAULT_CHANGELOG_SITE_WIDE = false;
export const DEFAULT_CHANGELOG_SITE_WIDE_SLUG = "changelog";
export const DEFAULT_CHANGELOG_MAX_PER_NOTE = 10;
export const DEFAULT_CHANGELOG_MAX_SITE_WIDE = 50;
export const DEFAULT_CHANGELOG_SHOW_AUTHOR = true;
export const DEFAULT_CHANGELOG_HEADING = true;
export const DEFAULT_CHANGELOG_PER_NOTE_HEADING = "Change history";
export const DEFAULT_CHANGELOG_SITE_WIDE_HEADING = "Changelog";
export const DEFAULT_CHANGELOG_CLASS_NAME = "rr-changelog";

/**
 * Applies defaults to `ChangelogOptions`. Pure and deterministic so the plugin
 * can resolve options once and reuse them for every manifest entry.
 */
export function resolveChangelogOptions(
  options: ChangelogOptions = {},
): ResolvedChangelogOptions {
  return {
    cwd: optionalText(options.cwd),
    lookbackDays: options.lookbackDays,
    dateFormat: options.dateFormat ?? DEFAULT_CHANGELOG_DATE_FORMAT,
    locale: optionalText(options.locale) ?? DEFAULT_CHANGELOG_LOCALE,
    perNote: options.perNote ?? DEFAULT_CHANGELOG_PER_NOTE,
    siteWide: options.siteWide ?? DEFAULT_CHANGELOG_SITE_WIDE,
    siteWideSlug:
      optionalText(options.siteWideSlug) ?? DEFAULT_CHANGELOG_SITE_WIDE_SLUG,
    maxPerNote: options.maxPerNote ?? DEFAULT_CHANGELOG_MAX_PER_NOTE,
    maxSiteWide: options.maxSiteWide ?? DEFAULT_CHANGELOG_MAX_SITE_WIDE,
    showAuthor: options.showAuthor ?? DEFAULT_CHANGELOG_SHOW_AUTHOR,
    heading: options.heading ?? DEFAULT_CHANGELOG_HEADING,
    perNoteHeading:
      optionalText(options.perNoteHeading) ??
      DEFAULT_CHANGELOG_PER_NOTE_HEADING,
    siteWideHeading:
      optionalText(options.siteWideHeading) ??
      DEFAULT_CHANGELOG_SITE_WIDE_HEADING,
    className: optionalText(options.className) ?? DEFAULT_CHANGELOG_CLASS_NAME,
  };
}

function optionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
