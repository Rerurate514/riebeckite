import {
  type ContentManifest,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
  type PluginManifestContext,
  type PostContent,
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

export type {
  PropertiesLinkResolver,
  PropertiesMessage,
  PropertiesOptions,
  PropertiesPosition,
  PropertiesRenderContext,
  PropertiesRenderMode,
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
 * Renders each note's frontmatter as an Obsidian-style property panel at build
 * time. By default the panel is prepended (or appended) to the manifest entry
 * HTML and to the cached `PostContent` so both the manifest-driven and the
 * content-driven routes show it (the query-plugin dual-mutation pattern). With
 * `render: "slot"` the panel is instead published on
 * `ContentManifestEntry.bodySlots` for the Site to place.
 */
export function properties(options: PropertiesOptions = {}) {
  const tracked = new Map<string, PostContent>();
  const resolved = resolvePropertiesOptions(options);

  return definePlugin({
    name: PLUGIN_NAME,
    options,
    validateOptions: validatePropertiesOptions,
    assets: [createStyleAsset(PLUGIN_NAME)],
    onPostProcessed: (context) => {
      tracked.set(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      applyPropertiesPanels(context, tracked, resolved);
    },
  });
}

export const propertiesPlugin = properties;

function applyPropertiesPanels(
  context: PluginManifestContext,
  tracked: Map<string, PostContent>,
  resolved: ReturnType<typeof resolvePropertiesOptions>,
): void {
  const { manifest, diagnostics } = context;
  const resolveLink = createLinkResolver(manifest);

  for (const entry of manifest.entries) {
    // Guard against double insertion when a panel was already rendered.
    if (!entry.html || entry.html.includes(PROPERTIES_ATTRIBUTE)) continue;

    const panel = renderPropertiesPanel(entry.frontmatter, resolved, {
      resolveLink,
      onMessage: (message) => emitFileMessage(diagnostics, entry.slug, message),
    });
    if (!panel) continue;

    if (resolved.render === "slot") {
      // The Site owns the body layout: publish the panel as a named slot
      // fragment instead of mutating the note HTML. Merge so other plugins'
      // slots are preserved.
      entry.bodySlots = { ...(entry.bodySlots ?? {}), properties: panel };
      continue;
    }

    const html =
      resolved.position === "end"
        ? `${entry.html}${panel}`
        : `${panel}${entry.html}`;
    entry.html = html;

    const content = tracked.get(entry.slug);
    if (content) content.html = html;
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
