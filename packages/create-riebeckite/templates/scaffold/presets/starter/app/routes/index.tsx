import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { getRecentPosts, RecentPosts } from "@riebeckite/plugin-recent-posts";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "../content";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    return c.render(<PageBody html={home.page.body} />);
  }

  const recentPosts = getRecentPosts({ manifest: await content.getManifest() });
  const tableOfContents = extractTableOfContents(home.post.html ?? "");

  return c.render(
    <SiteArticle
      post={home.post}
      bodySlots={home.entry.bodySlots}
      asideContent={<TableOfContents className="table-of-contents--desktop" items={tableOfContents} />}
      afterContent={<><RecentPosts posts={recentPosts} /></>}
    />,
  );
});
