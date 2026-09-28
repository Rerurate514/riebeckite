import {
  type ContentCollection,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
import slugify from "slugify";

export function slugifyTagPath(tag: string): string {
  return tag.split("/").map(slugifyTagSegment).join("/");
}

function slugifyTagSegment(segment: string): string {
  const slug = slugify(segment, { lower: true, strict: true });
  if (slug) return slug;
  // `strict` strips every non-ASCII character, so tags written in scripts such
  // as Japanese would all collapse into an empty segment and share a single
  // `/tags/` URL. Fall back to the original text (or its percent-encoding) so
  // each tag keeps its own stable URL.
  const raw = segment.trim();
  return raw || encodeURIComponent(segment);
}

export function buildTagHref(tag: string): string {
  return `/tags/${slugifyTagPath(tag)}`;
}

export function buildTagPage(collection: ContentCollection): PostContent {
  const posts = collection.entries
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  const exploreHref = `/explore?tag=${encodeURIComponent(collection.value)}`;

  return {
    frontmatter: {
      title: `#${collection.value}`,
    },
    html: `<h1>${escapeHtml(`#${collection.value}`)}</h1><p><a href="${escapeHtml(exploreHref)}">Explore this tag in Garden Explorer</a></p><ul>${posts}</ul>`,
  };
}
