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
import type { GeneratedOutputSink } from "./generated_output.js";
import type { PostContent } from "./post_content.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

export type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  /**
   * Registers a file to be written to the build output directory. Available
   * during build lifecycle hooks; the integration layer forwards each entry to
   * the build tool.
   */
  output: GeneratedOutputSink;
  logger: Logger;
  tracer: Tracer;
  contentSource?: ContentSource;
};

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

export type PluginGeneratedHtml = {
  /** Output-relative path of the generated HTML file (e.g. "index.html"). */
  path: string;
  /** Final page HTML produced by the SSG build. */
  html: string;
};

/**
 * Inspects a fully rendered HTML page after the SSG stage. Use this instead of
 * `addDiagnostics` when the rule needs the final document (head, layout,
 * navigation) rather than the article body HTML only.
 */
export type PluginGeneratedHtmlInspector = (
  page: PluginGeneratedHtml,
) => readonly Diagnostic[];
