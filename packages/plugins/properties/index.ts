import {
  appendContentBodySlot,
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
 * HTML, which is the final rendering source. With `render: "slot"` the panel is
 * instead published on `ContentManifestEntry.bodySlots` for the Site to place.
 */
export function properties(options: PropertiesOptions = {}) {
  const resolved = resolvePropertiesOptions(options);

  return definePlugin({
    name: PLUGIN_NAME,
    processedContentCache: {
      version: "properties-v1",
      dependencyMode: "none",
    },
    outputDependencies: [{ type: "global" }],
    options,
    validateOptions: validatePropertiesOptions,
    assets: [createStyleAsset(PLUGIN_NAME)],
    onManifestCreated: (context) => {
      applyPropertiesPanels(context, resolved);
    },
  });
}

export const propertiesPlugin = properties;

function applyPropertiesPanels(
  context: PluginManifestContext,
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
      if (!hasSlotPanel(entry.bodySlots?.properties, panel)) {
        appendContentBodySlot(entry, "properties", panel);
      }
      continue;
    }

    const html =
      resolved.position === "end"
        ? `${entry.html}${panel}`
        : `${panel}${entry.html}`;
    entry.html = html;
  }
}

function hasSlotPanel(slot: string | undefined, panel: string): boolean {
  return (
    slot === panel ||
    slot?.startsWith(`${panel}\n`) ||
    slot?.endsWith(`\n${panel}`) ||
    slot?.includes(`\n${panel}\n`) ||
    false
  );
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
