import type {
  DailyNotesOptions,
  ResolvedDailyNotesDisplay,
  ResolvedDailyNotesExtract,
} from "./daily_notes_types.js";
import {
  DEFAULT_CODE_BLOCK,
  DEFAULT_DAILY_NOTES_DATE_FORMAT,
  DEFAULT_DAILY_NOTES_LOCALE,
  DEFAULT_FRONTMATTER_KEY,
  DEFAULT_SECTION,
} from "./daily_notes_types.js";

export function resolveExtractOptions(
  options: DailyNotesOptions | undefined,
): ResolvedDailyNotesExtract {
  const extract = options?.extract;

  return {
    frontmatter:
      extract?.frontmatter === undefined
        ? DEFAULT_FRONTMATTER_KEY
        : extract.frontmatter,
    section: extract?.section === undefined ? DEFAULT_SECTION : extract.section,
    codeBlock:
      extract?.codeBlock === undefined ? DEFAULT_CODE_BLOCK : extract.codeBlock,
  };
}

export function resolveDisplayOptions(
  options: DailyNotesOptions | undefined,
): ResolvedDailyNotesDisplay {
  const locale = options?.locale;

  return {
    dateFormat: options?.dateFormat ?? DEFAULT_DAILY_NOTES_DATE_FORMAT,
    locale:
      typeof locale === "string" && locale.trim() !== ""
        ? locale.trim()
        : DEFAULT_DAILY_NOTES_LOCALE,
  };
}

/** Formats a normalized `YYYY-MM-DD` date for display. */
export function formatDailyNoteDate(
  dateIso: string,
  display: ResolvedDailyNotesDisplay,
): string {
  if (display.dateFormat === "iso") return dateIso;

  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateIso;

  return new Intl.DateTimeFormat(display.locale, {
    dateStyle: display.dateFormat === "long" ? "long" : "medium",
    timeZone: "UTC",
  }).format(date);
}
