import type { ContentManifestEntry, SeoMetadata } from "@riebeckite/core";

/** Feed formats the taxonomy plugin can generate per term. */
export type TaxonomyFeedFormat = "rss" | "atom" | "json";

/** A taxonomy grouping category. */
export type TaxonomyKind = "tag" | "folder";

/** Per-format feed output toggles. */
export type TaxonomyFeedOptions = {
  rss?: boolean;
  atom?: boolean;
  json?: boolean;
};

/** Options accepted by `taxonomy()`. */
export type TaxonomyOptions = {
  /** Generate tag terms. Defaults to `true`. */
  tags?: boolean;
  /** Generate folder terms. Defaults to `true`. */
  folders?: boolean;
  /** Site-local path prefix for tag pages. Defaults to `"/tags"`. */
  tagsBasePath?: string;
  /** Site-local path prefix for folder pages. Defaults to `"/folders"`. */
  foldersBasePath?: string;
  /** Folder grouping depth; `0` (or omitted) keeps the full folder path. */
  folderDepth?: number;
  /** Drop terms with fewer entries than this. Defaults to `1`. */
  minEntries?: number;
  /** Include related-term navigation for tag terms. Defaults to `true`. */
  related?: boolean;
  /** Maximum related terms per tag. Defaults to `8`. */
  relatedLimit?: number;
  /** Per-format feed generation. Defaults to RSS, Atom, and JSON. */
  feeds?: TaxonomyFeedOptions;
  /** Maximum entries included in a per-term feed. Defaults to `50`. */
  feedLimit?: number;
  /** Display title for a term. Defaults to `#value` for tags and the path for folders. */
  resolveTitle?: (context: TaxonomyTermContext) => string;
  /** Root CSS class used by the rendered page fragments. Defaults to `"rr-taxonomy"`. */
  className?: string;
  /** JSON data endpoint served for app routes and clients. Defaults to `"/taxonomy/index.json"`. */
  dataEndpoint?: string;
};

/** `TaxonomyOptions` with every default resolved. */
export type ResolvedTaxonomyOptions = {
  tags: boolean;
  folders: boolean;
  tagsBasePath: string;
  foldersBasePath: string;
  folderDepth: number;
  minEntries: number;
  related: boolean;
  relatedLimit: number;
  feeds: Required<TaxonomyFeedOptions>;
  feedLimit: number;
  className: string;
  dataEndpoint: string;
  resolveTitle?: (context: TaxonomyTermContext) => string;
};

/** Context passed to a custom `resolveTitle`. */
export type TaxonomyTermContext = {
  kind: TaxonomyKind;
  value: string;
  basePath: string;
};

/** A lightweight entry reference safe to serialize into JSON data. */
export type TaxonomyEntryReference = {
  slug: string;
  permalink: string;
  title: string;
  updated: string | null;
  summary: string;
};

/** A related-term reference used by related-tag navigation. */
export type TaxonomyRelatedTerm = {
  kind: TaxonomyKind;
  value: string;
  title: string;
  path: string;
  permalink: string;
  count: number;
};

/** Resolved feed URLs for one term. */
export type TaxonomyFeedLinks = {
  rss?: string;
  atom?: string;
  json?: string;
};

/** A single tag or folder listing. */
export type TaxonomyTerm = {
  kind: TaxonomyKind;
  /** Raw grouping key (`"Guide/Intro"`, `"notes/sub"`). */
  value: string;
  /** Display title, `#value` for tags by default. */
  title: string;
  /** Site-local listing path, for example `/tags/guide/intro`. */
  path: string;
  /** Resolved entries, in manifest query order. */
  entries: ContentManifestEntry[];
  /** Related terms (tags only). */
  related: TaxonomyRelatedTerm[];
  /** Generated feed paths (site-local). */
  feeds: TaxonomyFeedLinks;
  /** Site-local feed file paths that the build emits. */
  feedFiles: string[];
};

/** The complete tag and folder taxonomy for a manifest. */
export type TaxonomyIndex = {
  tags: TaxonomyTerm[];
  folders: TaxonomyTerm[];
};

/** JSON-safe projection of a {@link TaxonomyTerm}. */
export type TaxonomyTermData = {
  kind: TaxonomyKind;
  value: string;
  title: string;
  path: string;
  permalink: string;
  count: number;
  entries: TaxonomyEntryReference[];
  related: TaxonomyRelatedTerm[];
  feeds: TaxonomyFeedLinks;
};

/** JSON-safe projection of a {@link TaxonomyIndex}. */
export type TaxonomyIndexData = {
  tags: TaxonomyTermData[];
  folders: TaxonomyTermData[];
};

/** A rendered taxonomy listing page fragment. */
export type TaxonomyPage = {
  title: string;
  /** `PostContent`-compatible frontmatter for the listing page. */
  frontmatter: { title: string };
  html: string;
  /** `entry.headTags`-compatible feed discovery links. */
  headTags: TaxonomyHeadTag[];
};

/** Minimal head tag shape matching the Core `PluginHeadTag` contract. */
export type TaxonomyHeadTag = {
  tag: "link";
  attrs: Record<string, string>;
};

export type { SeoMetadata };
