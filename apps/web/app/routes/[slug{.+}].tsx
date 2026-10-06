import { getEntryLanguage } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveRiebeckiteRoute,
  riebeckiteSsgParams,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
import { buildArticleSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  ssgEnumerableHandler(async (c, next) => {
    const requestedSlug = c.req.param("slug");
    // Archive has a dedicated route; defer to it.
    if (c.req.path.startsWith("/archive/")) {
      return next();
    }
    if (!requestedSlug) return c.notFound();

    if (/\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const route = await resolveRiebeckiteRoute(content, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);
    if (route.kind === "page") {
      c.set(
        "seo",
        buildWebsiteSeo(
          {
            title: route.page.title ?? "",
            description: route.page.description ?? "",
            path: route.page.pathname,
          },
          route.page.headTags,
        ),
      );
      c.set("headTags", route.page.headTags ?? []);
      c.set("htmlLanguage", route.page.language);
      return c.render(
        <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
      );
    }
    const slug = route.entry.slug;

    const post = await content.getProcessedContent(slug);
    const tableOfContents = extractTableOfContents(post.html ?? "");
    c.set(
      "seo",
      buildArticleSeo(
        route.entry.permalink,
        post,
        route.entry.headTags,
        getEntryLanguage(route.entry),
      ),
    );
    c.set("headTags", route.entry.headTags ?? []);
    c.set("htmlLanguage", getEntryLanguage(route.entry));

    return c.render(
      <Article
        content={post}
        title={getArticleTitle(slug, post.frontmatter.title)}
        bodySlots={route.entry.bodySlots}
        asideContent={
          <TableOfContents
            className="table-of-contents--desktop"
            items={tableOfContents}
          />
        }
      />,
    );
  }),
);
