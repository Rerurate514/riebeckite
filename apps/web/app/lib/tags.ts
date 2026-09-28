import {
  type ContentCollection,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
import slugify from "slugify";

export function slugifyTagPath(tag: string): string {
  return tag
    .split("/")
    .map((seg) => slugify(seg, { lower: true, strict: true }))
    .join("/");
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
