import type { Diagnostic } from "./diagnostic";
import type { PluginAsset, PluginClientEntry } from "./plugin_asset";
import type {
  PluginAttachmentRenderContext,
  PluginContentContext,
  PluginContext,
  PluginGraphContext,
  PluginManifestContext,
  PluginPostContext,
} from "./plugin_context";
import type {
  HtmlPipeline,
  MarkdownPipeline,
  MarkdownPipelineContext,
  PipelinePlugin,
} from "./plugin_pipeline";
import type { PluginSeoExtension } from "./plugin_seo";

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
  extendMarkdownPipeline?(
    pipeline: MarkdownPipeline,
    context: MarkdownPipelineContext,
  ): void;
  extendHtmlPipeline?(pipeline: HtmlPipeline): void;
  addDiagnostics?(context: PluginContext): Diagnostic[] | Promise<Diagnostic[]>;
  assets?: PluginAsset[];
  clientEntries?: PluginClientEntry[];
  seo?: PluginSeoExtension;
  extendContentGraph?(context: PluginGraphContext): void | Promise<void>;
  renderAttachment?(
    context: PluginAttachmentRenderContext,
  ): string | null | Promise<string | null>;
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
