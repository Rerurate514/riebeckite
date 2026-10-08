import { content } from "virtual:riebeckite/content";
import { getEntryLanguage } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import HomePage from "../components/home/home";
import { getArticleTitle } from "../lib/article-title";
import { resolveWebLocale } from "../lib/locale";
import { buildArticleSeo, buildHomeSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  ssgEnumerableHandler(async (c, next) => {
    // Archive has a dedicated route; defer to it.
    if (c.req.path.startsWith("/archive/")) {
      return next();
    }

    const resolved = await resolveRiebeckiteContentRequest(c, content);
    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      c.set(
        "seo",
        buildWebsiteSeo(
          {
            title: resolved.page.title ?? "",
            description: resolved.page.description ?? "",
            path: resolved.page.pathname,
          },
          resolved.page.headTags,
        ),
      );
      return c.render(<PageBody html={resolved.page.body} />);
    }

    if (resolved.post.frontmatter.homepage === true) {
      const locale = resolveWebLocale(getEntryLanguage(resolved.entry));
      c.set("seo", buildHomeSeo(locale, resolved.entry.headTags));
      return c.render(<HomePage locale={locale} />);
    }

    const slug = resolved.entry.slug;
    const tableOfContents = extractTableOfContents(resolved.post.html ?? "");
    c.set(
      "seo",
      buildArticleSeo(
        resolved.entry.permalink,
        resolved.post,
        resolved.entry.headTags,
        getEntryLanguage(resolved.entry),
      ),
    );

    return c.render(
      <Article
        content={resolved.post}
        title={getArticleTitle(slug, resolved.post.frontmatter.title)}
        bodySlots={resolved.entry.bodySlots}
        asideContent={
          <TableOfContents
            className="rr-table-of-contents--desktop"
            items={tableOfContents}
          />
        }
      />,
    );
  }),
);
