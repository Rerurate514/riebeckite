import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import {
  extractAttributes,
  isSiteLocalReference,
  normalizeReferencePath,
} from "./site_integrity_links.js";
import { diagnostic } from "./site_integrity_shared.js";
import type { SiteIntegrityOptions } from "./site_integrity_types.js";

export function checkHtmlReferences(
  entry: ContentManifestEntry,
  publicRoutes: ReadonlySet<string>,
  assetPaths: ReadonlySet<string>,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const href of extractAttributes(entry.html, "href")) {
    if (!isSiteLocalReference(href)) continue;
    const path = normalizeReferencePath(href, entry.publicLocation.permalink);
    if (!path || publicRoutes.has(path)) continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:broken-link",
        slug: entry.slug,
        filePath: entry.publicLocation.permalink,
        target: href,
        message: `Internal link target "${href}" does not match a public route.`,
        suggestion:
          "Update the link, create the target content, or register the generated route from a plugin.",
        meta: { normalizedTarget: path },
      }),
    );
  }

  for (const src of extractAttributes(entry.html, "src")) {
    if (!isSiteLocalReference(src)) continue;
    const path = normalizeReferencePath(src, entry.publicLocation.permalink);
    const assetPath = path?.replace(/^\/+/, "");
    if (
      !path ||
      publicRoutes.has(path) ||
      (assetPath && assetPaths.has(assetPath))
    )
      continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:broken-asset",
        slug: entry.slug,
        filePath: entry.publicLocation.permalink,
        target: src,
        message: `Local asset target "${src}" does not match a published asset or route.`,
        suggestion:
          "Add the asset, fix the reference, or register the generated asset from a plugin.",
        meta: { normalizedTarget: path },
      }),
    );
  }
}

export function buildAssetPaths(manifest: ContentManifest): Set<string> {
  const paths = new Set<string>();
  for (const entry of manifest.entries) {
    for (const asset of entry.assets) paths.add(asset.path);
  }
  for (const asset of manifest.assets ?? [])
    paths.add(asset.path.replace(/^\/+/, ""));
  return paths;
}
