import type { Plugin } from "unified";
import type { Node } from "unist";
import type { ContentManifest, ContentManifestEntry } from "./content_manifest";
import type { Diagnostic } from "./diagnostic";
import type { PostContent } from "./post_content";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

export type PipelinePlugin = Plugin<[], Node, Node>;

export type { Diagnostic, DiagnosticCode, DiagnosticSeverity } from "./diagnostic";

export type PluginDiagnosticLevel = Diagnostic["severity"];

export type PluginDiagnostic = Diagnostic & { pluginName: string };

export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  path: string;
};

export type MarkdownPipeline = {
  use(plugin: PipelinePlugin, options?: unknown): void;
};

export type HtmlPipeline = MarkdownPipeline;

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

export type RiebeckitePlugin<TOptions = unknown> = {
  name: string;
  options?: TOptions;
  order?: number;
  enabled?: boolean;
  remarkPlugins?: PipelinePlugin[];
  rehypePlugins?: PipelinePlugin[];
  onConfigResolved?(context: PluginContext): void | Promise<void>;
  onContentLoaded?(context: PluginContentContext): void | Promise<void>;
  onPostParsed?(context: PluginPostContext): void | Promise<void>;
  onPostProcessed?(context: PluginPostContext): void | Promise<void>;
  onManifestCreated?(context: PluginManifestContext): void | Promise<void>;
  onBuildStart?(context: PluginContext): void | Promise<void>;
  onBuildEnd?(context: PluginManifestContext): void | Promise<void>;
  extendMarkdownPipeline?(pipeline: MarkdownPipeline): void;
  extendHtmlPipeline?(pipeline: HtmlPipeline): void;
  addDiagnostics?(context: PluginContext): Diagnostic[] | Promise<Diagnostic[]>;
  injectAssets?(context: PluginContext): PluginAsset[];
  extendContentGraph?(context: PluginGraphContext): void | Promise<void>;
};

export type PluginInput = RiebeckitePlugin | false | null | undefined;

export function definePlugin<TOptions>(
  plugin: RiebeckitePlugin<TOptions>,
): RiebeckitePlugin<TOptions> {
  return plugin;
}

export function resolvePlugins(
  plugins: PluginInput[] = [],
): RiebeckitePlugin[] {
  return plugins
    .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
    .filter((plugin) => plugin.enabled !== false)
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
