import type { ContentGraph } from "../content/content_graph.js";
import type { ResolvedPublishingState } from "../content/publishing.js";
import type { Diagnostic } from "./diagnostic.js";
import type { GeneratedOutput } from "./generated_output.js";
import type { PluginAsset, PluginClientEntry } from "./plugin_asset.js";
import type { PluginHeadTag } from "./plugin_head.js";
import type { PostFrontmatter } from "./post_content.js";

export type ContentLinkKind = "note" | "image" | "attachment" | "unresolved";

export type ContentLink = {
  raw: string;
  slug: string | null;
  kind: ContentLinkKind;
  embed: boolean;
};

export type ContentAsset = {
  path: string;
};

export type ContentManifestPluginAsset = PluginAsset & {
  path: string;
};

/**
 * The standard `article.*` positions the article consumer recognizes.
 *
 * These constants are a convenience for Sites that prefer named references;
 * writing the slot string inline (for example `name="article.metadata"`) stays
 * the recommended, most readable form in TSX layouts.
 */
export const ARTICLE_SLOT = {
  header: "article.header",
  metadata: "article.metadata",
  aside: "article.aside",
  beforeContent: "article.before-content",
  afterContent: "article.after-content",
  footer: "article.footer",
} as const;

/**
 * A semantic position in a Site-owned article layout.
 *
 * The standard article consumer recognizes the `article.*` positions below.
 * Other names remain valid so a custom Site can define its own layout slots.
 */
export type ContentBodySlot =
  | (typeof ARTICLE_SLOT)[keyof typeof ARTICLE_SLOT]
  | (string & {});

/**
 * A map of Plugin-provided HTML fragments keyed by slot name.
 *
 * The standard `article.*` names autocomplete while any custom slot name
 * remains valid, so custom Plugins keep working. A slot is considered empty
 * when its value is missing or whitespace-only.
 */
export type ContentBodySlots = Partial<
  Record<(typeof ARTICLE_SLOT)[keyof typeof ARTICLE_SLOT], string>
> &
  Readonly<Record<string, string | undefined>>;

/** Client entries and their explicitly public configuration. */
export type ContentManifestPluginClientEntry = PluginClientEntry;

export type ContentManifestEntry = {
  slug: string;
  /**
   * Optional source-authored stable content identity. It is independent of the
   * slug, permalink, aliases, and redirects.
   */
  contentId?: string;
  permalink: string;
  publicLocation: ContentPublicLocation;
  title: string;
  aliases?: readonly string[];
  frontmatter: PostFrontmatter;
  publishing: ResolvedPublishingState;
  html: string;
  /**
   * Head tags a plugin wants the Site shell to render for this entry.
   * The Site owns the shell, so it decides whether to render them.
   */
  headTags?: readonly PluginHeadTag[];
  /**
   * Plugin-provided HTML fragments the Site renders in named body slots.
   * The Site owns its layout, so it decides where (and whether) each slot is
   * rendered; a plugin only supplies the fragment, keyed by slot name.
   */
  bodySlots?: Readonly<Record<string, string>>;
  tags: string[];
  links: ContentLink[];
  backlinks: string[];
  assets: ContentAsset[];
};

/**
 * Appends a Plugin-provided HTML fragment to a named Site layout slot.
 *
 * Plugins publish fragments; the Site chooses which slots to render and where.
 * Appending preserves contributions from earlier plugins in resolved order.
 */
export function appendContentBodySlot(
  entry: ContentManifestEntry,
  slot: ContentBodySlot,
  html: string,
): void {
  if (!html.trim()) return;
  const previous = entry.bodySlots?.[slot];
  entry.bodySlots = {
    ...entry.bodySlots,
    [slot]: previous ? `${previous}\n${html}` : html,
  };
}

export type ContentRedirect = {
  path: string;
  status: 301 | 302 | 307 | 308;
};

export type ContentPublicLocation = {
  slug: string;
  permalink: string;
  language?: string;
  redirects?: readonly ContentRedirect[];
  metadata?: Readonly<Record<string, string>>;
};

export type FolderLocation = {
  pathname: string;
  folder?: string;
  language?: string;
};

export type PluginPageRoute = {
  pathname: string;
  pluginName: string;
  pageType: string;
};

export type ContentLocationInput = {
  slug: string;
  path: string;
  markdown: string;
};

export type ContentManifest = {
  entries: ContentManifestEntry[];
  /**
   * Entries that are routable and therefore get a generated page: `public`
   * and `unlisted` notes. `entries` keeps every scanned note for backward
   * compatibility; plugins that emit generated output should read this view
   * so drafts and scheduled notes never reach generated output.
   */
  publicEntries: ContentManifestEntry[];
  /** Entries that may appear on discovery surfaces such as navigation, search, feeds, taxonomy, and public graphs. */
  discoverableEntries: ContentManifestEntry[];
  bySlug: Map<string, ContentManifestEntry>;
  /** Contains only entries with an explicit source-authored content ID. */
  byContentId: Map<string, ContentManifestEntry>;
  byAlias: Map<string, ContentManifestEntry[]>;
  byPermalink: Map<string, ContentManifestEntry>;
  /** Contains only routable entries: public and unlisted, excluding draft and scheduled-before entries. */
  byRoutablePermalink: Map<string, ContentManifestEntry>;
  redirects: Map<string, ContentRedirect & { slug: string }>;
  /**
   * Redirects whose owning entry is public. Prevents unpublished notes from
   * leaking their previous paths into deploy files.
   */
  publicRedirects: Map<string, ContentRedirect & { slug: string }>;
  byTag: Map<string, ContentManifestEntry[]>;
  byAsset: Map<string, ContentManifestEntry[]>;
  outgoingLinks: Map<string, ContentLink[]>;
  incomingLinks: Map<string, string[]>;
  contentIndex: Map<string, string>;
  /**
   * Lookup keys that matched more than one candidate, mapped to their
   * candidates (sorted). These keys are intentionally absent from
   * `contentIndex` so links stay unresolved instead of picking a target by
   * discovery order. Used to report actionable ambiguity diagnostics.
   */
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
  graph: ContentGraph;
  assets: ContentManifestPluginAsset[];
  /**
   * Browser entries registered by plugins. This contains only each entry's
   * explicit `publicConfig`, never the plugin's complete `options` object.
   */
  clientEntries: ContentManifestPluginClientEntry[];
  diagnostics: Diagnostic[];
  generatedOutputs: GeneratedOutput[];
  folderLocations: Map<string, FolderLocation>;
  pageRoutes: PluginPageRoute[];
  pagePaths: string[];
};
