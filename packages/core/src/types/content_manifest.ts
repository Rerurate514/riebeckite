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
 * A semantic position in a Site-owned article layout.
 *
 * The standard article consumer recognizes the `article.*` positions below.
 * Other names remain valid so a custom Site can define its own layout slots.
 */
export type ContentBodySlot =
  | "article.after-header"
  | "article.after-meta"
  | "article.aside"
  | "article.before-content"
  | "article.after-content"
  | "article.footer"
  | (string & {});

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
  redirects?: readonly ContentRedirect[];
  metadata?: Readonly<Record<string, string>>;
};

export type FolderLocation = {
  pathname: string;
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
   * Entries that pass the configured publish strategy. `entries` keeps every
   * scanned note for backward compatibility; publishing plugins should read
   * this view so unpublished notes never reach generated output.
   */
  publicEntries: ContentManifestEntry[];
  /** Entries that may appear on discovery surfaces such as navigation, search, feeds, taxonomy, and public graphs. */
  discoverableEntries: ContentManifestEntry[];
  bySlug: Map<string, ContentManifestEntry>;
  /** Contains only entries with an explicit source-authored content ID. */
  byContentId: Map<string, ContentManifestEntry>;
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
