import type { ResolvedRiebeckiteConfig, SeoMetadata } from "@riebeckite/core";
import { resolvePlugins } from "@riebeckite/core";
import type { TaxonomyTerm } from "./types.js";
import { buildTaxonomyAbsoluteUrl } from "./url.js";

/**
 * Builds SEO metadata for a taxonomy listing page.
 *
 * When a plugin provides the Core `seo` extension point (for example
 * `@riebeckite/plugin-seo`), the metadata is delegated to it so titles,
 * canonical URLs, and JSON-LD stay consistent with the rest of the site. A
 * minimal fallback keeps the helper usable without an SEO provider.
 */
export function buildTaxonomySeo(
  config: ResolvedRiebeckiteConfig,
  term: TaxonomyTerm,
): SeoMetadata {
  const description = buildDescription(term);
  const provider = resolvePlugins(config.plugins).find(
    (plugin) => plugin.seo !== undefined,
  )?.seo;

  if (provider) {
    return provider.buildWebsiteSeo(config, {
      title: term.title,
      description,
      path: term.path,
      kind: term.kind === "tag" ? "tag" : "website",
    });
  }

  const image = config.site.defaultOgImage;
  return {
    title:
      config.site.title && config.site.title !== term.title
        ? `${term.title} | ${config.site.title}`
        : term.title,
    description,
    canonicalUrl: buildTaxonomyAbsoluteUrl(config, term.path),
    imageUrl: image ? buildTaxonomyAbsoluteUrl(config, image) : "",
    type: "website",
    noindex: false,
    tags: term.kind === "tag" ? [term.value] : [],
  };
}

function buildDescription(term: TaxonomyTerm): string {
  if (term.kind === "tag") {
    return `Notes tagged with ${term.title}.`;
  }
  return `Notes filed under ${term.title}.`;
}
