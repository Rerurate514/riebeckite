import { isPublished } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { getPublishedBacklinks } from "../backlinks";
import Article from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(
  ssgParams(async () => {
    const posts = await content.getAllPosts();
    const results = await Promise.all(
      posts.map(async (post) => {
        try {
          const processed = await content.getProcessedContent(post.slug);
          return {
            slug: post.slug,
            isPublish: isPublished(config, processed?.frontmatter),
          };
        } catch (e) {
          console.error(`Failed to process ${post.slug}:`, e);
          return { slug: post.slug, isPublish: false };
        }
      }),
    );
    return results.filter((r) => r.isPublish).map((r) => ({ slug: r.slug }));
  }),
  async (c, next) => {
    const slug = c.req.param("slug");
    if (c.req.path.startsWith("/tags/")) {
      return next();
    }

    if (!slug) return c.notFound();

    if (/\.[a-zA-Z0-9]+$/.test(slug)) return c.notFound();

    const post = await content.getProcessedContent(slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

    if (slug === "index") {
      return c.redirect("/", 301);
    }

    const backlinks = await getPublishedBacklinks(slug);

    return c.render(<Article content={post} backlinks={backlinks} />);
  },
);
