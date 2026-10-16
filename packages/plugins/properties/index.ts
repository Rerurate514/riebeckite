import {
  type ContentManifest,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
  type PluginManifestContext,
} from "@riebeckite/core";
import {
  DEFAULT_PROPERTIES_CLASS,
  DEFAULT_PROPERTIES_EXCLUDE,
  DEFAULT_PROPERTIES_TITLE,
  PROPERTIES_ATTRIBUTE,
  resolvePropertiesOptions,
  validatePropertiesOptions,
} from "./src/options.js";
import { buildTagHref, renderPropertiesPanel } from "./src/render.js";
import type {
  PropertiesLinkResolver,
  PropertiesMessage,
  PropertiesOptions,
} from "./src/types.js";

export type { PropertiesProps } from "./components/properties.js";
export { default as Properties } from "./components/properties.js";
export type {
  PropertiesData,
  PropertiesValuePart,
} from "./src/component-data.js";
export { getProperties } from "./src/component-data.js";

export type {
  PropertiesLinkResolver,
  PropertiesMessage,
  PropertiesOptions,
  PropertiesRenderContext,
  ResolvedPropertiesOptions,
} from "./src/types.js";
export {
  buildTagHref,
  DEFAULT_PROPERTIES_CLASS,
  DEFAULT_PROPERTIES_EXCLUDE,
  DEFAULT_PROPERTIES_TITLE,
  PROPERTIES_ATTRIBUTE,
  renderPropertiesPanel,
  resolvePropertiesOptions,
  validatePropertiesOptions,
};

const PLUGIN_NAME = "properties";
const PACKAGE_NAME = "@riebeckite/plugin-properties";

/**
 * Reports frontmatter values that cannot be rendered as structured HTML. The
 * panel itself is rendered by the Site from `getProperties()`; this manifest
 * hook only emits build-time warnings.
 */
export function properties(options: PropertiesOptions = {}) {
  const resolved = resolvePropertiesOptions(options);

  return definePlugin({
    name: PLUGIN_NAME,
    processedContentCache: {
      version: "properties-v1",
      dependencyMode: "none",
    },
    contentOutputDependencies: [{ type: "global" }],
    options,
    validateOptions: validatePropertiesOptions,
    assets: [createStyleAsset(PLUGIN_NAME)],
    onManifestCreated: (context) => {
      reportUnrenderableValues(context, resolved);
    },
  });
}

export const propertiesPlugin = properties;

function reportUnrenderableValues(
  context: PluginManifestContext,
  resolved: ReturnType<typeof resolvePropertiesOptions>,
): void {
  const { manifest, diagnostics } = context;
  const resolveLink = createLinkResolver(manifest);

  for (const entry of manifest.entries) {
    renderPropertiesPanel(entry.frontmatter, resolved, {
      resolveLink,
      onMessage: (message) => emitFileMessage(diagnostics, entry.slug, message),
    });
  }
}

function createLinkResolver(manifest: ContentManifest): PropertiesLinkResolver {
  return (target: string) => {
    const [path, anchor] = target.split(/[#^]/, 2);
    const key = path?.trim().toLowerCase();
    if (!key) return null;

    const slug = manifest.contentIndex.get(key);
    if (!slug) return null;

    const entry = manifest.bySlug.get(slug);
    if (!entry) return null;

    return anchor ? `${entry.permalink}#${anchor}` : entry.permalink;
  };
}

/**
 * Manifest-time hooks have no VFile, so this mirrors `file.message` by pushing
 * a diagnostic tagged with the package as its source.
 */
function emitFileMessage(
  diagnostics: Diagnostic[],
  slug: string,
  message: PropertiesMessage,
): void {
  diagnostics.push({
    code: "properties-unrenderable-value",
    severity: "warning",
    pluginName: PLUGIN_NAME,
    slug,
    message: message.reason,
    meta: {
      source: PACKAGE_NAME,
      propertyKey: message.propertyKey,
    },
  });
}
