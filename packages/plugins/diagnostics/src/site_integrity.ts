import type { ContentManifest, Diagnostic } from "@riebeckite/core";
import { buildAssetPaths, checkHtmlReferences } from "./site_integrity_html.js";
import { checkResolvedLinks } from "./site_integrity_links.js";
import {
  checkRedirectCycles,
  checkRedirectTargets,
} from "./site_integrity_redirects.js";
import {
  buildRouteOwners,
  checkAmbiguousFolderPageOwners,
} from "./site_integrity_routes.js";
import type { SiteIntegrityOptions } from "./site_integrity_types.js";

export function checkSiteIntegrity(
  manifest: ContentManifest,
  options: SiteIntegrityOptions = {},
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const publicSlugs = new Set(
    manifest.publicEntries.map((entry) => entry.slug),
  );
  const routeOwners = buildRouteOwners(manifest, diagnostics, options);
  const publicRoutes = new Set(routeOwners.keys());
  const assetPaths = buildAssetPaths(manifest);
  const noteSlugs = new Set(manifest.entries.map((entry) => entry.slug));
  const ambiguities = manifest.contentIndexAmbiguities ?? new Map();

  for (const entry of manifest.publicEntries) {
    checkResolvedLinks(
      entry,
      publicSlugs,
      assetPaths,
      noteSlugs,
      ambiguities,
      diagnostics,
      options,
    );
    checkHtmlReferences(entry, publicRoutes, assetPaths, diagnostics, options);
  }

  checkRedirectTargets(manifest, diagnostics, options);
  checkRedirectCycles(manifest, diagnostics, options);
  checkAmbiguousFolderPageOwners(manifest, diagnostics, options);

  return diagnostics;
}
