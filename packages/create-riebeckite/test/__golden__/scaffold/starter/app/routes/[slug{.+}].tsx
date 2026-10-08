import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "virtual:riebeckite/content";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  async (c) => {
    const resolved = await resolveRiebeckiteContentRequest(c, content);

    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      return c.render(<PageBody html={resolved.page.body} />);
    }

    const tableOfContents = extractTableOfContents(resolved.post.html ?? "");

    return c.render(
      <SiteArticle
        post={resolved.post}
        bodySlots={resolved.entry.bodySlots}
        asideContent={<TableOfContents className="rr-table-of-contents--desktop" items={tableOfContents} />}
      />,
    );
  },
);
