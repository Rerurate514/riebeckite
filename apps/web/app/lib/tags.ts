import { isPublished, type PostContent } from "@riebeckite/core";
import slugify from "slugify";
import { config } from "../config";
import { content } from "../content";

export interface TagEntry {
  tag: string;
  posts: { slug: string; title: string }[];
}

export function slugifyTagPath(tag: string): string {
  return tag
    .split("/")
    .map((seg) => slugify(seg, { lower: true, strict: true }))
    .join("/");
}

export function buildTagHref(tag: string): string {
  return `/tags/${slugifyTagPath(tag)}`;
}

export function buildTagPage(entry: TagEntry): PostContent {
  const posts = entry.posts
    .map(
      (post) =>
        `<li><a href="/${encodeURI(post.slug)}">${escapeHtml(post.title)}</a></li>`,
    )
    .join("");
  const exploreHref = `/explore?tag=${encodeURIComponent(entry.tag)}`;

  return {
    frontmatter: {
      title: `#${entry.tag}`,
    },
    html: `<h1>${escapeHtml(`#${entry.tag}`)}</h1><p><a href="${escapeHtml(exploreHref)}">Explore this tag in Garden Explorer</a></p><ul>${posts}</ul>`,
  };
}

let cachedTagIndex: Map<string, TagEntry> | null = null;

export async function buildTagIndex(): Promise<Map<string, TagEntry>> {
  if (cachedTagIndex) return cachedTagIndex;

  const manifest = await content.getManifest();
  const map = new Map<string, TagEntry>();

  for (const entry of manifest.entries) {
    if (!isPublished(config, entry.frontmatter)) continue;

    for (const rawTag of entry.tags) {
      const key = slugifyTagPath(rawTag);
      if (!map.has(key)) {
        map.set(key, { tag: rawTag, posts: [] });
      }
      const tagEntry = map.get(key);
      if (!tagEntry) continue;

      tagEntry.posts.push({
        slug: entry.slug,
        title: entry.title,
      });
    }
  }

  cachedTagIndex = map;
  return map;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
