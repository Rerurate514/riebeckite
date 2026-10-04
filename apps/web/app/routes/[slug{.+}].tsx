import {
  contentRouteSsgParams,
  resolveRiebeckiteRoute,
  riebeckiteSsgParams,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import { hasBreadcrumbHeadTag } from "@riebeckite/plugin-breadcrumbs";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
import { buildArticleSeo, buildWebsiteSeo, type SeoMetadata } from "../lib/seo";

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
        buildWebsiteSeo({
          title: route.page.title ?? "",
          description: route.page.description ?? "",
          path: route.page.pathname,
        }),
      );
      c.set("headTags", route.page.headTags ?? []);
      return c.render(
        <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
      );
    }
    const slug = route.entry.slug;

    const post = await content.getProcessedContent(slug);
    const tableOfContents = extractTableOfContents(post.html ?? "");
    const seo = buildArticleSeo(route.entry.permalink, post);
    // The breadcrumbs plugin contributes the hierarchical BreadcrumbList as a
    // head tag; drop the seo plugin's two-level placeholder for this entry so
    // the page carries a single BreadcrumbList entity.
    if (hasBreadcrumbHeadTag(route.entry.headTags)) {
      seo.jsonLd = withoutBreadcrumbList(seo.jsonLd);
    }
    c.set("seo", seo);
    c.set("headTags", route.entry.headTags ?? []);
    c.set("htmlLanguage", route.entry.publicLocation.metadata?.["l10n.lang"]);

    return c.render(
      <Article
        content={post}
        title={getArticleTitle(slug, post.frontmatter.title)}
        propertiesHtml={route.entry.bodySlots?.properties}
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

/** Removes the seo plugin's placeholder BreadcrumbList from article JSON-LD. */
function withoutBreadcrumbList(
  jsonLd: SeoMetadata["jsonLd"],
): SeoMetadata["jsonLd"] {
  if (!Array.isArray(jsonLd)) return jsonLd;
  return jsonLd.filter((schema) => schema?.["@type"] !== "BreadcrumbList");
}
