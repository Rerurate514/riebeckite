import type {
  ContentLocationInput,
  ContentPublicLocation,
} from "../types/content_manifest.js";

/**
 * Core's official default public location resolver.
 *
 * Every content entry is resolved to a location by this resolver before plugin
 * location resolution runs. It is the single source of the slug-derived URL
 * model (`index` -> `/`, otherwise `/<slug>`); no consumer may re-derive a
 * content URL from a slug.
 */
export function resolveDefaultContentLocation(
  content: ContentLocationInput,
): ContentPublicLocation {
  return {
    slug: content.slug,
    permalink: content.slug === "index" ? "/" : `/${content.slug}`,
  };
}
