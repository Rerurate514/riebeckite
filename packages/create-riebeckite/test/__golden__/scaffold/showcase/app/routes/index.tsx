import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { DailyNotes, getDailyNotes } from "@riebeckite/plugin-daily-notes";
import { getRecentPosts, RecentPosts } from "@riebeckite/plugin-recent-posts";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    return c.render(<PageBody html={home.page.body} />);
  }

  const manifest = await content.getManifest();
  const recentPosts = getRecentPosts({ manifest });
  const dailyNotes = getDailyNotes({ manifest, config });
  const tableOfContents = extractTableOfContents(home.post.html ?? "");

  return c.render(
    <SiteArticle
      post={home.post}
      bodySlots={home.entry.bodySlots}
      asideContent={<TableOfContents className="rr-table-of-contents--desktop" items={tableOfContents} />}
      afterContent={<><RecentPosts posts={recentPosts} /><DailyNotes notes={dailyNotes} /></>}
    />,
  );
});
