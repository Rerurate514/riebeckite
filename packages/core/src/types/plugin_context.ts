import type { ContentSource } from "../content/content_source.js";
import type { Logger, Tracer } from "../observability.js";
import type { PluginCache } from "../plugin/plugin_cache.js";
import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "./content_manifest.js";
import type { Diagnostic } from "./diagnostic.js";
import type { PostContent } from "./post_content.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

export type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  logger: Logger;
  tracer: Tracer;
  /** Source of logical vault entries; plugins must not access the vault directly. */
  contentSource?: ContentSource;
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

export type PluginContentLocationContext = PluginContext & {
  entries: readonly ContentLocationInput[];
};

export type PluginContentLocationResolver = (
  context: PluginContentLocationContext,
) =>
  | readonly ContentPublicLocation[]
  | Promise<readonly ContentPublicLocation[]>;

/**
 * Context for augmenting already-resolved public locations.
 *
 * Runs after every `resolveContentLocations` resolver, so a plugin can add
 * redirects or metadata without replacing (and therefore without needing to
 * reproduce) the canonical permalink another plugin resolved.
 */
export type PluginContentLocationAugmentContext = PluginContext & {
  entries: readonly ContentLocationInput[];
  locations: Map<string, ContentPublicLocation>;
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
