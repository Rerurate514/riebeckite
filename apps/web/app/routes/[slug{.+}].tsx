import { isPublished } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveContentRoute,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import { Backlinks, getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { getLocalGraph, LocalGraph } from "@riebeckite/plugin-local-graph";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
import { buildArticleSeo } from "../lib/seo";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\/+/, "") }));
  }),
  ssgEnumerableHandler(async (c, next) => {
    const requestedSlug = c.req.param("slug");
    // Tags and archive have dedicated routes; defer to them.
    if (c.req.path.startsWith("/tags/") || c.req.path.startsWith("/archive/")) {
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
    c.set("htmlLanguage", route.entry.publicLocation.metadata?.["l10n.lang"]);

    return c.render(
      <Article
        content={post}
        title={getArticleTitle(route.entry.slug, post.frontmatter.title)}
        propertiesHtml={route.entry.bodySlots?.properties}
        bodySlots={route.entry.bodySlots}
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
  }),
);
