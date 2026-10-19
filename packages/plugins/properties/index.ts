import {
  type ContentManifest,
  type ContentManifestEntry,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
  type OutputDependency,
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
    resolveContentOutputDependencies: ({ entry, manifest }) =>
      propertyOutputDependencies(entry, manifest, resolved),
    options,
    validateOptions: validatePropertiesOptions,
    assets: [
      createStyleAsset(PLUGIN_NAME, "@riebeckite/plugin-properties/style.css"),
    ],
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

function propertyOutputDependencies(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  options: ReturnType<typeof resolvePropertiesOptions>,
): readonly OutputDependency[] {
  const dependencies = new Map<string, OutputDependency>();
  for (const [, value] of selectedProperties(entry.frontmatter, options)) {
    for (const target of wikilinkTargets(value)) {
      const slug = manifest.contentIndex.get(target.toLowerCase());
      if (!slug || !manifest.bySlug.has(slug)) return [{ type: "global" }];
      dependencies.set(slug, { type: "content", slug });
    }
  }
  return [...dependencies.values()];
}

function selectedProperties(
  frontmatter: Readonly<Record<string, unknown>>,
  options: ReturnType<typeof resolvePropertiesOptions>,
): readonly (readonly [string, unknown])[] {
  return Object.entries(frontmatter).filter(
    ([key, value]) =>
      value !== undefined &&
      (options.include
        ? options.include.includes(key)
        : !options.exclude.includes(key)) &&
      (!options.hideEmpty || !isEmpty(value)),
  );
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function* wikilinkTargets(value: unknown): Generator<string> {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g)) {
      const target = match[1]?.split(/[#^]/, 1)[0]?.trim();
      if (target) yield target;
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) yield* wikilinkTargets(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) yield* wikilinkTargets(item);
  }
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
