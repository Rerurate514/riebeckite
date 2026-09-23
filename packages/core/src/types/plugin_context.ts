import type { ContentManifest, ContentManifestEntry } from "./content_manifest";
import type { Diagnostic } from "./diagnostic";
import type { PostContent } from "./post_content";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

export type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
};

export type PluginContentContext = PluginContext & {
  slug: string;
  markdown: string;
};

export type PluginPostContext = PluginContentContext & {
  content: PostContent;
};

export type PluginManifestContext = PluginContext & {
  manifest: ContentManifest;
};

export type PluginGraphContext = PluginContext & {
  entries: ContentManifestEntry[];
};

export type PluginAttachmentRenderContext = PluginContext & {
  path: string;
  raw: string;
  label: string;
  url: string;
  embed: boolean;
};
