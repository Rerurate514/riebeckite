import { isPublished } from "@riebeckite/core";
import { Backlinks, getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { getLocalGraph, LocalGraph } from "@riebeckite/plugin-local-graph";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
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

    const manifest = await content.getManifest();
    const backlinks = getPublishedBacklinks({
      manifest,
      config,
      slug,
      resolveTitle: getArticleTitle,
    });
    const localGraph = getLocalGraph({
      manifest,
      config,
      slug,
      resolveTitle: getArticleTitle,
    });
    const tableOfContents = extractTableOfContents(post.html ?? "");
    c.set("seo", buildArticleSeo(slug, post));

    return c.render(
      <Article
        content={post}
        asideContent={
          <TableOfContents
            className="table-of-contents--desktop"
            items={tableOfContents}
          />
        }
        footerContent={
          <>
            {localGraph && <LocalGraph graph={localGraph} />}
            <Backlinks backlinks={backlinks} />
          </>
        }
      />,
    );
  },
);
