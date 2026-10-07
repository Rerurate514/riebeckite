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
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
import { buildArticleSeo, buildWebsiteSeo } from "../lib/seo";

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
            className="table-of-contents--desktop"
            items={tableOfContents}
          />
        }
      />,
    );
  }),
);
