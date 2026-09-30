import {
  type ContentLocationInput,
  type ContentPublicLocation,
  type Diagnostic,
  resolveDefaultContentLocation,
} from "@riebeckite/core";
import type { ResolvedTaxonomyOptions } from "./types.js";

const PLUGIN_NAME = "taxonomy";

/**
 * Public-location strategy for folder index notes.
 *
 * Core's default resolver collapses only the root `index` slug to `/`. When
 * `folderIndexes` is enabled, a note at `<folder>/index.md` resolves to
 * `/<folder>` instead of `/<folder>/index`, so each folder can own its index
 * page. The chosen permalink is recorded in `metadata["taxonomy.folder"]`.
 *
 * The resolver never overwrites a location that another note already claims as
 * its default permalink; it reports a diagnostic instead.
 */
export function resolveFolderIndexLocations(
  entries: readonly ContentLocationInput[],
  options: ResolvedTaxonomyOptions,
  diagnostics: Diagnostic[],
): ContentPublicLocation[] {
  if (!options.folderIndexes) return [];

  const permalinkOwners = new Map<string, string>();
  for (const entry of entries) {
    const location = resolveDefaultContentLocation(entry);
    if (!permalinkOwners.has(location.permalink)) {
      permalinkOwners.set(location.permalink, entry.slug);
    }
  }

  const locations: ContentPublicLocation[] = [];
  for (const entry of entries) {
    const suffix = "/index";
    if (!entry.slug.endsWith(suffix)) continue;
    const folder = entry.slug.slice(0, -suffix.length);
    if (folder === "") continue;

    const target = `/${folder}`;
    const owner = permalinkOwners.get(target);
    if (owner && owner !== entry.slug) {
      diagnostics.push({
        code: "taxonomy-folder-index-collision",
        severity: "warning",
        pluginName: PLUGIN_NAME,
        message: `Folder index "${entry.path}" already maps to a note at "${target}"; keeping the default location.`,
        slug: entry.slug,
        target,
      });
      continue;
    }

    locations.push({
      slug: entry.slug,
      permalink: target,
      metadata: { "taxonomy.folder": folder },
    });
  }

  return locations;
}
