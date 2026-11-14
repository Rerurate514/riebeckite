import type { RiebeckitePlugin } from "../types/plugin.js";
import type { PluginPageType } from "../types/plugin_page.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

export type PluginPageResolverOptions = {
  readonly plugins: () => readonly RiebeckitePlugin[];
  readonly createContext: (
    contentIndex: Map<string, string>,
  ) => PluginContextBase;
  readonly createPluginContext: <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ) => PluginContextWithCache<TContext>;
  readonly renderMarkdown: (markdown: string) => Promise<string>;
};

export type DeclaredPluginPage = {
  readonly pathname: string;
  readonly plugin: RiebeckitePlugin;
  readonly pageType: PluginPageType;
  readonly sourceSlugs?: readonly string[];
};
