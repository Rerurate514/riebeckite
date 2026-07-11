import { createRoute } from "honox/factory";
import { ssgParams } from "hono/ssg";
import slugify from "slugify";
import { getAllPosts, getPost, buildContentIndex } from "../../logic/get_post";
import { Pipeline } from "@riebeckite/core";
// import TagPostList from "../components/tag-post-list";

let cachedIndex: Map<string, string> | null = null;
async function getContentIndex() {
  if (!cachedIndex) cachedIndex = await buildContentIndex();
  return cachedIndex;
}

const contentCache = new Map<string, any>();
async function getProcessedContent(slug: string) {
  if (contentCache.has(slug)) return contentCache.get(slug)!;
  const contentIndex = await getContentIndex();
  const rawPost = await getPost(slug);
  const pipeline = new Pipeline(contentIndex);
  const content = await pipeline.execute(rawPost);
  contentCache.set(slug, content);
  return content;
}

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

let cachedTagIndex: Map<string, TagEntry> | null = null;

async function buildTagIndex(): Promise<Map<string, TagEntry>> {
  if (cachedTagIndex) return cachedTagIndex;

  const posts = await getAllPosts();
  const map = new Map<string, TagEntry>();

  await Promise.all(
    posts.map(async (post) => {
      try {
        const content = await getProcessedContent(post.slug);
        if (!content?.frontmatter?.publish) return;

        const tags: string[] = content.frontmatter.tags ?? [];
        for (const rawTag of tags) {
          const key = slugifyTagPath(rawTag);
          if (!map.has(key)) {
            map.set(key, { tag: rawTag, posts: [] });
          }
          map.get(key)!.posts.push({
            slug: post.slug,
            title: content.frontmatter.title ?? post.slug,
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

    return c.render(<div>
      <p>post: </p><p>a : {entry}</p>
    </div>);

    //return c.render(<TagPostList tag={entry.tag} posts={entry.posts} />);
  },
);
