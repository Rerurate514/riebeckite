/** Public options accepted by the `series()` plugin factory. */
export type SeriesOptions = {
  /** Frontmatter key that names the series. Defaults to `"series"`. */
  key?: string;
  /** Frontmatter key that holds the numeric order. Defaults to `"series_order"`. */
  orderKey?: string;
  /** Frontmatter key that overrides the displayed series title. Defaults to `"series_title"`. */
  titleKey?: string;
  /** Render the series heading above the part list. Defaults to `true`. */
  heading?: boolean;
  /** Base CSS class prefix. Defaults to `"rb-series"`. */
  className?: string;
  /** Render a `Part N of M` label for the current note. Defaults to `false`. */
  positionLabel?: boolean;
};

/** Options after defaults have been applied. */
export type ResolvedSeriesOptions = {
  key: string;
  orderKey: string;
  titleKey: string;
  heading: boolean;
  className: string;
  positionLabel: boolean;
};

/** A single note that belongs to a series. */
export type SeriesMember = {
  slug: string;
  title: string;
  permalink: string;
  /** Numeric `orderKey` value, or `null` when it was missing or invalid. */
  order: number | null;
  /** The series name exactly as written in frontmatter. */
  series: string;
};

/** An ordered series and all of its members. */
export type SeriesIndex = {
  /** Series name from frontmatter (used as the grouping key). */
  name: string;
  /** Display title: the first `titleKey` value, or `name` when absent. */
  title: string;
  /** Members sorted by `order`, then date, title, and slug. */
  members: SeriesMember[];
};
