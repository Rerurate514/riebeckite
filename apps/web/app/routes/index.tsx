import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { content } from "../content";
import { buildIndexSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    c.set(
      "seo",
      buildWebsiteSeo(
        {
          title: home.page.title ?? "",
          description: home.page.description ?? "",
          path: home.page.pathname,
        },
        home.page.headTags,
      ),
    );
    return c.render(<PageBody html={home.page.body} />);
  }

  const tableOfContents = extractTableOfContents(home.post.html ?? "");
  c.set("seo", buildIndexSeo(home.post, home.entry.headTags));

  return c.render(
    <Article
      content={home.post}
      title={home.post.frontmatter.title}
      bodySlots={home.entry.bodySlots}
      asideContent={
        <TableOfContents
          className="table-of-contents--desktop"
          items={tableOfContents}
        />
      }
    />,
  );
});
