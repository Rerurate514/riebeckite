import { createRoute } from "honox/factory";
import { Pipeline, PostContent } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { buildContentIndex, getAllPosts, getPost } from "../logic/get_post";
import Article from "../components/article";

let cachedIndex: Map<string, string> | null = null;
async function getContentIndex() {
  if (!cachedIndex) cachedIndex = await buildContentIndex();
  return cachedIndex;
}

const contentCache = new Map<string, PostContent>();

async function getProcessedContent(slug: string) {
  if (contentCache.has(slug)) return contentCache.get(slug)!;
  const contentIndex = await getContentIndex();
  const rawPost = await getPost(slug);
  const pipeline = new Pipeline(contentIndex);
  const content = await pipeline.execute(rawPost);
  contentCache.set(slug, content);
  return content;
}

export default createRoute(
  ssgParams(async () => {
    const posts = await getAllPosts();
    const results = await Promise.all(
      posts.map(async (post) => {
        try {
          const content = await getProcessedContent(post.slug);
          return { slug: post.slug, isPublish: !!content?.frontmatter.publish };
        } catch (e) {
          console.error(`Failed to process ${post.slug}:`, e);
          return { slug: post.slug, isPublish: false };
        }
      }),
    );
    return results.filter((r) => r.isPublish).map((r) => ({ slug: r.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const content = await getProcessedContent(slug);
    if (!content) return c.notFound();

    if (!content || !content.frontmatter.publish) {
      return c.notFound();
    }

    if (slug === "index") {
      return c.redirect("/", 301);
    }

    return c.render(<Article content={content} />);
  },
);
