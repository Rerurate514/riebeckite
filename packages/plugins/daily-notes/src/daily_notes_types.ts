export type DailyNote = {
  date: string;
  dateDisplay: string;
  snippet: string;
  slug: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

/** How Daily Note dates are formatted in the widget. */
export type DailyNotesDateFormat = "iso" | "long" | "short";
export type DailyNotesOptions = {
  source?: {
    /** Slug prefix that holds Daily Notes. Defaults to `"Daily"`. */
    directory?: string;
    /** Optional slug template (for example `"Daily/{YYYY}-{MM}-{DD}"`). */
    pathPattern?: string;
    /**
     * Obsidian/Moment date format used by the note filenames. Defaults to
     * `"YYYY-MM-DD"`.
     */
    dateFormat?: string;
  };
  extract?: {
    /** Frontmatter key to read the snippet from. Defaults to `"daily-summary"`. */
    frontmatter?: string | false;
    /** Heading whose section becomes the snippet. Defaults to `"今日のひとこと"`. */
    section?: string | false;
    /** Code block language to read the snippet from. Defaults to `"daily-snippet"`. */
    codeBlock?: string | false;
  };
  widget?: {
    /** Maximum number of notes to surface. Defaults to `5`. */
    limit?: number;
  };
  /** Date format for the widget. Defaults to `"iso"`. */
  dateFormat?: DailyNotesDateFormat;
  /** Locale used by `"long"` and `"short"` dates. Defaults to `"en"`. */
  locale?: string;
};

export type ResolvedDailyNotesExtract = {
  frontmatter: string | false;
  section: string | false;
  codeBlock: string | false;
};

export type ResolvedDailyNotesDisplay = {
  dateFormat: DailyNotesDateFormat;
  locale: string;
};

export const DAILY_NOTES_PLUGIN_NAME = "daily-notes";
export const DEFAULT_DIRECTORY = "Daily";
export const DEFAULT_FRONTMATTER_KEY = "daily-summary";
export const DEFAULT_SECTION = "今日のひとこと";
export const DEFAULT_CODE_BLOCK = "daily-snippet";
export const DEFAULT_LIMIT = 5;
export const DEFAULT_DAILY_NOTES_DATE_FORMAT: DailyNotesDateFormat = "iso";
export const DEFAULT_DAILY_NOTES_LOCALE = "en";
export const DEFAULT_SLUG_DATE_FORMAT = "YYYY-MM-DD";
