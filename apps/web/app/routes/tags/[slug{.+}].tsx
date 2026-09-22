import { isPublished, type PostContent } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import slugify from "slugify";
import Article from "../../components/article";
import { config } from "../../config";
import { content } from "../../content";

function slugifyTagPath(tag: string): string {
  return tag
    .split("/")
    .map((seg) => slugify(seg, { lower: true, strict: true }))
    .join("/");
}

interface TagEntry {
  tag: string;
  posts: { slug: string; title: string }[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTagPage(entry: TagEntry): PostContent {
  const posts = entry.posts
    .map(
      (post) =>
        `<li><a href="/${encodeURI(post.slug)}">${escapeHtml(post.title)}</a></li>`,
    )
    .join("");

  return {
    frontmatter: {
      title: `#${entry.tag}`,
    },
    html: `<h1>${escapeHtml(`#${entry.tag}`)}</h1><ul>${posts}</ul>`,
  };
}

let cachedTagIndex: Map<string, TagEntry> | null = null;

async function buildTagIndex(): Promise<Map<string, TagEntry>> {
  if (cachedTagIndex) return cachedTagIndex;

  const posts = await content.getAllPosts();
  const map = new Map<string, TagEntry>();

  await Promise.all(
    posts.map(async (post) => {
      try {
        const article = await content.getProcessedContent(post.slug);
        if (!isPublished(config, article?.frontmatter)) return;

        const tags: string[] = article.frontmatter.tags ?? [];
        for (const rawTag of tags) {
          const key = slugifyTagPath(rawTag);
          if (!map.has(key)) {
            map.set(key, { tag: rawTag, posts: [] });
          }
          const entry = map.get(key);
          if (!entry) return;

          entry.posts.push({
            slug: post.slug,
            title: article.frontmatter.title ?? post.slug,
          });
        }
      } catch (e) {
        console.error(`Failed to index tags for ${post.slug}:`, e);
      }
    }),
  );

  cachedTagIndex = map;
  return map;
}

export default createRoute(
  ssgParams(async () => {
    const tagIndex = await buildTagIndex();
    return Array.from(tagIndex.keys()).map((slug) => ({ slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const tagIndex = await buildTagIndex();
    const entry = tagIndex.get(slug);
    if (!entry) return c.notFound();

    return c.render(<Article content={buildTagPage(entry)} />);
  },
);
