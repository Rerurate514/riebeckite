import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";

/**
 * Resolves a site-local path against the configured site `baseUrl`. Mirrors the
 * SEO plugin's absolute-URL convention so taxonomy feeds and metadata match the
 * rest of the site without depending on the SEO package.
 */
export function buildTaxonomyAbsoluteUrl(
  config: ResolvedRiebeckiteConfig,
  pathOrUrl: string,
): string {
  if (!pathOrUrl) return config.site.baseUrl;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;

  return new URL(
    pathOrUrl,
    config.site.baseUrl || "https://example.com",
  ).toString();
}
