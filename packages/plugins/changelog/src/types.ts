/** How commit dates are formatted in rendered output. */
export type ChangelogDateFormat = "iso" | "long" | "short";

/** Options accepted by `changelog()`. */
export type ChangelogOptions = {
  /**
   * Working directory for Git commands. Defaults to `process.cwd()`. Point it
   * at the content directory when the site is built from elsewhere.
   */
  cwd?: string;
  /**
   * Only include commits newer than this many days. When omitted, the full
   * history is used.
   */
  lookbackDays?: number;
  /** Date format for rendered entries. Defaults to `"iso"`. */
  dateFormat?: ChangelogDateFormat;
  /** Locale used by `"long"` and `"short"` dates. Defaults to `"en"`. */
  locale?: string;
  /** Render a per-note history section on every public note. Defaults to `true`. */
  perNote?: boolean;
  /**
   * Build the site-wide changelog and inject it into the note at
   * `siteWideSlug`. Defaults to `false`. The note itself is owned by the app;
   * the plugin only fills its body slot.
   */
  siteWide?: boolean;
  /** Slug of the note that receives the site-wide changelog. Defaults to `"changelog"`. */
  siteWideSlug?: string;
  /** Maximum commits listed per note. Defaults to `10`. */
  maxPerNote?: number;
  /** Maximum commits listed in the site-wide changelog. Defaults to `50`. */
  maxSiteWide?: number;
  /** Show the commit author. Defaults to `true`. */
  showAuthor?: boolean;
  /** Render an `<h2>` heading above each listing. Defaults to `true`. */
  heading?: boolean;
  /** Heading text for per-note history. Defaults to `"Change history"`. */
  perNoteHeading?: string;
  /** Heading text for the site-wide changelog. Defaults to `"Changelog"`. */
  siteWideHeading?: string;
  /** Root CSS class. Defaults to `"rr-changelog"`. */
  className?: string;
};

/** `ChangelogOptions` with every default applied. */
export type ResolvedChangelogOptions = {
  cwd?: string;
  lookbackDays?: number;
  dateFormat: ChangelogDateFormat;
  locale: string;
  perNote: boolean;
  siteWide: boolean;
  siteWideSlug: string;
  maxPerNote: number;
  maxSiteWide: number;
  showAuthor: boolean;
  heading: boolean;
  perNoteHeading: string;
  siteWideHeading: string;
  className: string;
};

/** A commit exactly as returned by the Git-backed reader. */
export type ChangelogCommit = {
  hash: string;
  shortHash: string;
  /** ISO 8601 committer date. */
  date: string;
  subject: string;
  author: string;
  /** Paths changed by the commit, relative to the Git working directory. */
  files: string[];
};

/** A commit prepared for rendering. */
export type ChangelogRecord = {
  hash: string;
  shortHash: string;
  /** Display date formatted for the resolved options. */
  date: string;
  /** Machine-readable ISO 8601 date. */
  dateIso: string;
  subject: string;
  author: string;
};

/** Per-note change history, ready to render. */
export type NoteChangeHistory = {
  slug: string;
  permalink: string;
  title: string;
  commits: ChangelogRecord[];
};

/** A note touched by a site-wide changelog commit. */
export type SiteChangelogNote = {
  slug: string;
  permalink: string;
  title: string;
};

/** A site-wide changelog entry: a commit plus the notes it touched. */
export type SiteChangelogEntry = ChangelogRecord & {
  notes: SiteChangelogNote[];
};

/** The site-wide changelog dataset, ready for the app to render. */
export type SiteChangelog = {
  entries: SiteChangelogEntry[];
};

/** Options accepted by `GitChangelogReader`. */
export type GitChangelogReaderOptions = {
  /** Working directory for Git commands. Defaults to `process.cwd()`. */
  cwd?: string;
};
