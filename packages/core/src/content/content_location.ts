import type {
  ContentLocationInput,
  ContentPublicLocation,
} from "../types/content_manifest.js";

export function resolveDefaultContentLocation(
  content: ContentLocationInput,
): ContentPublicLocation {
  return {
    slug: content.slug,
    permalink: content.slug === "index" ? "/" : `/${content.slug}`,
  };
}
