import type { ContentGraph } from "../content/content_graph.js";
import type { Diagnostic } from "./diagnostic.js";
import type { PluginAsset } from "./plugin_asset.js";
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

export type ContentManifestEntry = {
  slug: string;
  /** Resolved canonical site-local URL. */
  permalink: string;
  publicLocation: ContentPublicLocation;
  title: string;
  frontmatter: PostFrontmatter;
  html: string;
  tags: string[];
  links: ContentLink[];
  backlinks: string[];
  assets: ContentAsset[];
};

export type ContentRedirect = {
  path: string;
  status: 301 | 302 | 307 | 308;
};

/**
 * A resolved public location for a content entry. `metadata` is intentionally
 * opaque to Core; it lets a resolver expose its own inspect-only details.
 */
export type ContentPublicLocation = {
  slug: string;
  permalink: string;
  redirects?: readonly ContentRedirect[];
  metadata?: Readonly<Record<string, string>>;
};

/** Input for public location resolution (default resolver and plugin hook). */
export type ContentLocationInput = {
  slug: string;
  path: string;
  markdown: string;
};

export type ContentManifest = {
  entries: ContentManifestEntry[];
  bySlug: Map<string, ContentManifestEntry>;
  byPermalink: Map<string, ContentManifestEntry>;
  redirects: Map<string, ContentRedirect & { slug: string }>;
  byTag: Map<string, ContentManifestEntry[]>;
  byAsset: Map<string, ContentManifestEntry[]>;
  outgoingLinks: Map<string, ContentLink[]>;
  incomingLinks: Map<string, string[]>;
  contentIndex: Map<string, string>;
  graph: ContentGraph;
  assets: ContentManifestPluginAsset[];
  diagnostics: Diagnostic[];
};
