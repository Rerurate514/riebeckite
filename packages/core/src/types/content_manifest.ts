import type { PostFrontmatter } from "./post_content";

export type ContentLinkKind = "note" | "asset" | "unresolved";

export type ContentLink = {
  raw: string;
  slug: string | null;
  kind: ContentLinkKind;
  embed: boolean;
};

export type ContentAsset = {
  path: string;
};

export type ContentManifestEntry = {
  slug: string;
  title: string;
  frontmatter: PostFrontmatter;
  html: string;
  tags: string[];
  links: ContentLink[];
  backlinks: string[];
  assets: ContentAsset[];
};

export type ContentManifest = {
  entries: ContentManifestEntry[];
  bySlug: Map<string, ContentManifestEntry>;
  byTag: Map<string, ContentManifestEntry[]>;
  byAsset: Map<string, ContentManifestEntry[]>;
  outgoingLinks: Map<string, ContentLink[]>;
  incomingLinks: Map<string, string[]>;
  contentIndex: Map<string, string>;
};
