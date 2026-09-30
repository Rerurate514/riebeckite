/**
 * A single card in a `gallery` block.
 *
 * Every field is optional, but an item should provide at least a `title` or an
 * `image` so the card has something to show.
 */
export type GalleryItem = {
  /** Image source URL, resolved by the site like any other Markdown image. */
  image?: string;
  /** Alternative text for `image`. Falls back to `title`, then to `""`. */
  alt?: string;
  title?: string;
  description?: string;
  /** When omitted the card is rendered as a non-interactive `<div>`. */
  href?: string;
  /** Small trailing label, for example a version or a date. */
  meta?: string;
};

/** A parsed and validated `gallery` block definition. */
export type GallerySpec = {
  readonly items: readonly GalleryItem[];
  readonly columns: number;
  readonly aspect: string;
};

export type GalleryOptions = {
  /** Fenced code block language treated as a gallery. Defaults to `gallery`. */
  language?: string;
  /** Column count used when a block omits `columns`. Defaults to `3`. */
  columns?: number;
  /** Aspect ratio used when a block omits `aspect`. Defaults to `"4/3"`. */
  aspect?: string;
};

/** A non-fatal issue found while parsing a gallery block. */
export type GalleryWarning = {
  readonly code: "gallery-item-incomplete";
  readonly message: string;
};

export type GalleryParseResult =
  | {
      readonly ok: true;
      readonly spec: GallerySpec;
      readonly warnings: readonly GalleryWarning[];
    }
  | {
      readonly ok: false;
      /** Clause completing "Gallery block in `<slug>` …". */
      readonly reason: string;
    };
