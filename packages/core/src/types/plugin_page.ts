import type { ContentManifest } from "./content_manifest.js";
import type { PluginContext } from "./plugin_context.js";

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
  paths?: readonly string[] | ((context: PluginContext & { manifest: ContentManifest }) => readonly string[] | Promise<readonly string[]>);
  /** Higher values win when more than one type matches a request. */
  priority?: number;
  resolve(context: PluginPageContext): PluginPage | null | Promise<PluginPage | null>;
};

export type ResolvedPluginPage = PluginPage & {
  pluginName: string;
};
