import {
  type ConfigValidationIssue,
  type ContentManifest,
  type ContentManifestEntry,
  createStyleAsset,
  definePlugin,
  type OutputDependency,
} from "@riebeckite/core";
import {
  buildBreadcrumbItems,
  createPublicLocationIndex,
  type PublicLocationIndex,
  resolveIndexedPublicFolderLocation,
} from "./src/breadcrumbs.js";
import { resolveBreadcrumbsOptions } from "./src/options.js";
import {
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
} from "./src/render.js";
import type { BreadcrumbsOptions } from "./src/types.js";

export type { BreadcrumbsProps } from "./components/breadcrumbs.js";
export { default as Breadcrumbs } from "./components/breadcrumbs.js";
export {
  buildBreadcrumbItems,
  getBreadcrumbs,
} from "./src/breadcrumbs.js";
export { resolveBreadcrumbsOptions } from "./src/options.js";
export {
  BREADCRUMBS_ATTRIBUTE,
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
  renderBreadcrumbNav,
} from "./src/render.js";
export type {
  BreadcrumbItem,
  BreadcrumbsOptions,
  ResolvedBreadcrumbsOptions,
} from "./src/types.js";

export const BREADCRUMBS_PLUGIN_NAME = "breadcrumbs";

/**
 * Public-location breadcrumbs for Riebeckite notes.
 *
 * For every published entry it derives a trail from the note's canonical public location and
 * contributes a `<nav>` to the article header. The hierarchical BreadcrumbList
 * JSON-LD is contributed
 * through `entry.headTags` so the Site shell can render it in the document
 * `<head>`. No client runtime is required.
 */
export function breadcrumbs(options: BreadcrumbsOptions = {}) {
  const resolved = resolveBreadcrumbsOptions(options);

  return definePlugin({
    name: BREADCRUMBS_PLUGIN_NAME,
    optional: ["content.folder-pages"],
    processedContentCache: {
      version: "breadcrumbs-v1",
      dependencyMode: "none",
    },
    resolveContentOutputDependencies: ({ entry, manifest }) =>
      breadcrumbOutputDependencies(entry, manifest),
    options,
    validateOptions: validateBreadcrumbsOptions,
    manifestHookFastPathSafe: true,
    onManifestCreated: (context) => {
      const { config, manifest } = context;
      if (!config) return;
      const locations = createPublicLocationIndex(manifest);
      for (const entry of manifest.publicEntries) {
        const items = buildBreadcrumbItems({
          manifest,
          entry,
          config,
          homeLabel: resolved.homeLabel,
          locations,
        });
        if (items.length === 0) continue;

        if (resolved.jsonLd) {
          const schema = buildBreadcrumbJsonLd(config, items);
          if (!hasBreadcrumbHeadTag(entry.headTags)) {
            entry.headTags = [
              ...(entry.headTags ?? []),
              buildBreadcrumbHeadTag(schema),
            ];
          }
        }
      }
    },
    assets: [
      createStyleAsset(
        BREADCRUMBS_PLUGIN_NAME,
        "@riebeckite/plugin-breadcrumbs/style.css",
      ),
    ],
  });
}

type CachedPublicLocationIndex = {
  publicEntries: ContentManifest["publicEntries"];
  folderLocations: ContentManifest["folderLocations"];
  publicEntriesLength: number;
  folderLocationsSize: number;
  index: PublicLocationIndex;
};

const outputLocationIndexes = new WeakMap<
  ContentManifest,
  CachedPublicLocationIndex
>();

function outputLocationIndex(manifest: ContentManifest): PublicLocationIndex {
  const cached = outputLocationIndexes.get(manifest);
  if (
    cached &&
    cached.publicEntries === manifest.publicEntries &&
    cached.folderLocations === manifest.folderLocations &&
    cached.publicEntriesLength === manifest.publicEntries.length &&
    cached.folderLocationsSize === manifest.folderLocations.size
  ) {
    return cached.index;
  }

  const index = createPublicLocationIndex(manifest);
  outputLocationIndexes.set(manifest, {
    publicEntries: manifest.publicEntries,
    folderLocations: manifest.folderLocations,
    publicEntriesLength: manifest.publicEntries.length,
    folderLocationsSize: manifest.folderLocations.size,
    index,
  });
  return index;
}

function breadcrumbOutputDependencies(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): readonly OutputDependency[] {
  const segments = entry.publicLocation.permalink.split("/").filter(Boolean);
  const dependencies: OutputDependency[] = [];
  const locations = outputLocationIndex(manifest);
  for (let index = 0; index < segments.length - 1; index += 1) {
    const pathname = `/${segments.slice(0, index + 1).join("/")}`;
    const location = resolveIndexedPublicFolderLocation(locations, pathname);
    if (location.type === "content") {
      dependencies.push({ type: "public-location", pathname });
    } else if (location.type === "generated") {
      const folder = [...manifest.folderLocations.values()].find(
        (candidate) => candidate.pathname === location.pathname,
      )?.folder;
      if (folder) dependencies.push({ type: "folder", folder });
    }
  }
  return dependencies;
}

function validateBreadcrumbsOptions(
  options: BreadcrumbsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  const assertNonEmptyString = (key: keyof BreadcrumbsOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  };
  assertNonEmptyString("homeLabel");
  assertNonEmptyString("className");
  assertNonEmptyString("ariaLabel");
  assertNonEmptyString("separator");
  for (const key of ["jsonLd"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}
