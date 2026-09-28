import type { ContentGraph } from "../content/content_graph.js";
import type { Diagnostic } from "./diagnostic.js";
import type { GeneratedOutput } from "./generated_output.js";
import type { PluginAsset } from "./plugin_asset.js";
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

export type ContentManifestEntry = {
  slug: string;
  permalink: string;
  publicLocation: ContentPublicLocation;
  title: string;
  frontmatter: PostFrontmatter;
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
  bySlug: Map<string, ContentManifestEntry>;
  byPermalink: Map<string, ContentManifestEntry>;
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
  diagnostics: Diagnostic[];
  generatedOutputs: GeneratedOutput[];
};
