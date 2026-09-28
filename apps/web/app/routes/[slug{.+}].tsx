import { isPublished } from "@riebeckite/core";
import { resolveContentRoute } from "@riebeckite/honox/server";
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
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\/+/, "") }));
  }),
  async (c, next) => {
    const requestedSlug = c.req.param("slug");
    if (c.req.path.startsWith("/tags/")) {
      return next();
    }

    if (!requestedSlug) return c.notFound();

    if (/\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const manifest = await content.getManifest();
    const route = resolveContentRoute(manifest, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);
    const slug = route.entry.slug;

    const post = await content.getProcessedContent(slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

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
    c.set("seo", buildArticleSeo(route.entry.permalink, post));
    c.set("headTags", route.entry.headTags ?? []);

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
