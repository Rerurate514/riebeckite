import {
  type ContentIconRegistry,
  type ContentManifestEntry,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
} from "@riebeckite/core";
import { remarkIcons } from "./src/remark.js";
import {
  createIconResolver,
  type IconResolver,
  resolveIconsOptions,
  validateIconsOptions,
} from "./src/resolve.js";
import { type LoadedIconsSettings, loadIconsSettings } from "./src/settings.js";
import type { IconsOptions } from "./src/types.js";

export type {
  IconOverride,
  IconPrecedence,
  IconSource,
  IconsOptions,
  ResolvedIconsOptions,
} from "./src/types.js";

const PLUGIN_NAME = "icons";
const EXTERNAL_ID = "icons:settings";

export function icons(options: IconsOptions = {}) {
  const resolvedOptions = resolveIconsOptions(options);
  let loaded: LoadedIconsSettings | undefined;
  let resolver: IconResolver | undefined;
  const ruleDiagnostics = new Map<string, Diagnostic>();

  const reportRule = (
    rule: { id?: string; name?: string },
    message: string,
  ): void => {
    const key = `${rule.id ?? rule.name ?? "rule"}:${message}`;
    ruleDiagnostics.set(key, {
      code: "icons-unsupported-rule",
      severity: "info",
      pluginName: PLUGIN_NAME,
      message: `Iconic rule "${rule.name ?? rule.id ?? "unnamed"}" ${message}; it did not match.`,
      meta: { ...(rule.id ? { ruleId: rule.id } : {}) },
    });
  };

  return definePlugin({
    name: PLUGIN_NAME,
    order: 20,
    options,
    contentFileMetadata: true,
    validateOptions: validateIconsOptions,
    processedContentCache: {
      version: "icons-v1",
      dependencyMode: "none",
      environmentFingerprint: () => loaded?.fingerprint,
    },
    contentOutputDependencies: [{ type: "external", id: EXTERNAL_ID }],
    assets: [
      createStyleAsset(PLUGIN_NAME, "@riebeckite/plugin-icons/style.css"),
    ],
    resolveExternalDependencies: async (context) => {
      ruleDiagnostics.clear();
      resolver = undefined;
      try {
        loaded = await loadIconsSettings(resolvedOptions, context.config);
        resolver = createIconResolver({
          settings: loaded,
          options: resolvedOptions,
          reportRule,
        });
      } catch {
        loaded = undefined;
        resolver = undefined;
        ruleDiagnostics.set("icons-load-failed", {
          code: "icons-load-failed",
          severity: "warning",
          pluginName: PLUGIN_NAME,
          message:
            "Obsidian icon settings could not be loaded; continuing without icons.",
        });
      }
      return [
        {
          kind: "resolved" as const,
          snapshot: {
            id: EXTERNAL_ID,
            fingerprint: loaded?.fingerprint ?? "icons-unavailable",
            scope: { type: "all" as const },
            value: { version: 1 },
          },
        },
      ];
    },
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkIcons, {
        identifier: resolver?.identifier ?? ":",
        resolve: (name: string) => resolver?.inline(name),
      });
    },
    onManifestCreated: ({ manifest }) => {
      if (!loaded || !resolver) return;
      for (const entry of manifest.entries) {
        const icon = resolver.forEntry(entry);
        if (icon) entry.icon = icon;
      }

      const folders = collectFolders(
        manifest.entries,
        manifest.folderLocations,
      );
      const tags = new Map<string, NonNullable<ContentManifestEntry["icon"]>>();
      const properties = new Map<
        string,
        NonNullable<ContentManifestEntry["icon"]>
      >();
      const folderIcons = new Map<
        string,
        NonNullable<ContentManifestEntry["icon"]>
      >();

      for (const folder of folders) {
        const icon = resolver.forFolder(folder);
        if (icon) folderIcons.set(folder, icon);
      }

      for (const entry of manifest.entries) {
        for (const tag of entry.tags) {
          if (tags.has(tag)) continue;
          const icon = resolver.forTag(tag);
          if (icon) tags.set(tag, icon);
        }
        for (const property of Object.keys(entry.frontmatter)) {
          if (properties.has(property)) continue;
          const icon = resolver.forProperty(property);
          if (icon) properties.set(property, icon);
        }
      }

      for (const [pathname, location] of manifest.folderLocations) {
        const folder = location.folder ?? pathname;
        const icon = folderIcons.get(folder) ?? resolver.forFolder(folder);
        if (icon) location.icon = icon;
      }

      const registry: ContentIconRegistry = {
        ...(tags.size ? { tags: Object.fromEntries(tags) } : {}),
        ...(properties.size
          ? { properties: Object.fromEntries(properties) }
          : {}),
        ...(folderIcons.size
          ? { folders: Object.fromEntries(folderIcons) }
          : {}),
      };
      if (Object.keys(registry).length > 0) manifest.icons = registry;
    },
    addDiagnostics: () => {
      const diagnostics: Diagnostic[] = [];
      for (const diagnostic of loaded?.diagnostics ?? []) {
        diagnostics.push({
          code: diagnostic.code,
          severity: diagnostic.severity,
          pluginName: PLUGIN_NAME,
          message: diagnostic.message,
          ...(diagnostic.meta ? { meta: { ...diagnostic.meta } } : {}),
        });
      }
      for (const warning of resolver?.warnings() ?? []) {
        diagnostics.push({
          code: "icons-unresolved-icon",
          severity: "warning",
          pluginName: PLUGIN_NAME,
          message: warning,
        });
      }
      diagnostics.push(...ruleDiagnostics.values());
      return diagnostics;
    },
  });
}

function collectFolders(
  entries: readonly ContentManifestEntry[],
  folderLocations: ReadonlyMap<string, { folder?: string }>,
): string[] {
  const folders = new Set<string>();
  for (const entry of entries) {
    const segments = entry.slug.split("/");
    segments.pop();
    for (let index = 1; index <= segments.length; index += 1) {
      folders.add(segments.slice(0, index).join("/"));
    }
  }
  for (const location of folderLocations.values()) {
    if (location.folder) folders.add(location.folder);
  }
  return [...folders].filter(Boolean).toSorted();
}
