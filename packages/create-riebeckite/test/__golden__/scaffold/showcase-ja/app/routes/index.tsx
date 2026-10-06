import { getEntryLanguage } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { DailyNotes, getDailyNotes } from "@riebeckite/plugin-daily-notes";
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { SiteArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (indexEntry?.publishing?.routable === false) {
    return c.notFound();
  }

  const recentPosts = await getRecentPosts({ posts: manifest.discoverableEntries, config, getProcessedContent: (slug) => content.getProcessedContent(slug), resolveTitle: (slug, title) => typeof title === "string" && title.trim() ? title : slug.split("/").at(-1) ?? slug });
  const dailyNotes = getDailyNotes({ manifest, config });
  const tableOfContents = extractTableOfContents(post.html ?? "");

  if (indexEntry) {
    c.set("htmlLanguage", getEntryLanguage(indexEntry));
    c.set("headTags", indexEntry.headTags ?? []);
  }

  return c.render(
    <SiteArticle
      post={post}
        bodySlots={indexEntry?.bodySlots}
        asideContent={<TableOfContents className="table-of-contents--desktop" items={tableOfContents} />}
        afterContent={<><RecentPosts posts={recentPosts} /><DailyNotes notes={dailyNotes} /></>}
    />,
  );
});