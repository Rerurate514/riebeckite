import type { ContentGraph } from "../content/content_graph";
import type { Diagnostic } from "./diagnostic";
import type { PluginAsset } from "./plugin_asset";
import type { PostFrontmatter } from "./post_content";

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
  /** Canonical site-local URL. Plugins may replace the legacy slug-derived URL. */
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
 * A generic public location declared by a plugin. `metadata` is intentionally
 * opaque to Core; it lets a plugin expose its own inspect-only details.
 */
export type ContentPublicLocation = {
  slug: string;
  permalink: string;
  redirects?: readonly ContentRedirect[];
  metadata?: Readonly<Record<string, string>>;
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
