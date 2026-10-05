import type { ContentManifest } from "./content_manifest.js";
import type { OutputDependency } from "./output_dependency.js";
import type { PluginContext } from "./plugin_context.js";
import type { PluginHeadTag } from "./plugin_head.js";

/** A framework-independent page supplied by a Riebeckite plugin. */
export type PluginPage = {
  /** Stable identifier of the page type that produced this page. */
  type: string;
  /** Canonical, absolute URL path. */
  pathname: string;
  /** HTML for the page body. The site owns the surrounding document frame. */
  body: string;
  title?: string;
  description?: string;
  /** Optional document metadata rendered by the site's document frame. */
  headTags?: readonly PluginHeadTag[];
  /** Language of the page when the page type resolved one. */
  language?: string;
};

export type PluginPageContext = PluginContext & {
  /** The public manifest. Unpublished content is not exposed through pages. */
  manifest: ContentManifest;
  /** Request pathname, normalized to an absolute path. */
  pathname: string;
};

export type PluginPageType = {
  /** Globally unique, stable page type identifier. */
  id: string;
  /** Paths emitted by SSG for this type. */
  paths?:
    | readonly string[]
    | ((
        context: PluginContext & { manifest: ContentManifest },
      ) => readonly string[] | Promise<readonly string[]>);
  /** Higher values win when more than one type matches a request. */
  priority?: number;
  directoryIndex?: boolean;
  outputDependencies?:
    | readonly OutputDependency[]
    | ((
        context: PluginContext & {
          manifest: ContentManifest;
          pathname: string;
        },
      ) => readonly OutputDependency[] | Promise<readonly OutputDependency[]>);
  resolve(
    context: PluginPageContext,
  ): PluginPage | null | Promise<PluginPage | null>;
};

export type ResolvedPluginPage = PluginPage & {
  pluginName: string;
};
