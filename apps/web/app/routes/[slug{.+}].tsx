import { isPublished } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { getPublishedBacklinks } from "../components/backlinks/backlinks.server";
import { config } from "../config";
import { content } from "../content";
import { buildArticleSeo } from "../lib/seo";

export default createRoute(
  ssgParams(async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .map((entry) => ({ slug: entry.slug }));
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
    c.set("seo", buildArticleSeo(slug, post));

    return c.render(<Article content={post} backlinks={backlinks} />);
  },
);
