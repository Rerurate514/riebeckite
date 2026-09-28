import type { ContentManifest, ContentManifestEntry } from "./content_manifest";
import type { Diagnostic } from "./diagnostic";
import type { PostContent } from "./post_content";
import type { PluginCache } from "../plugin/plugin_cache";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

export type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
};

/**
 * Context shared by plugin lifecycle hooks.
 *
 * This alias intentionally shares the base plugin context so lifecycle-wide
 * services can be added without duplicating the context shape.
 */
export type PluginLifecycleContext = PluginContext;

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

export type PluginRenderTarget = {
  kind: string;
  path: string;
  raw: string;
  label: string;
  url: string;
  embed: boolean;
};

export type PluginRenderContext = PluginContext & PluginRenderTarget;

export type PluginContentRenderer = {
  name?: string;
  render(context: PluginRenderContext): string | null | Promise<string | null>;
};

export type PluginRenderInput = {
  kind: string;
  path: string;
  raw: string;
  label: string;
  url: string;
  embed: boolean;
};
