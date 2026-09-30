/**
 * Slugifies a raw taxonomy value into a URL/file path. Nested values keep their
 * `/` separators, so `Guide/Intro` becomes `guide/intro`.
 *
 * ASCII segments are lowercased and reduced to `[a-z0-9]` with `-` separators.
 * A segment that reduces to nothing (for example a Japanese tag, which loses
 * every character under `strict` ASCII slugification) falls back to its
 * percent-encoded text so distinct values never share a URL.
 */
export function slugifyTaxonomyValue(value: string): string {
  return value
    .split("/")
    .map(slugifyTaxonomySegment)
    .filter((segment) => segment.length > 0)
    .join("/");
}

function slugifyTaxonomySegment(segment: string): string {
  const slug = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug) return slug;

  const raw = segment.trim();
  return raw === "" ? "" : encodeURIComponent(raw);
}
