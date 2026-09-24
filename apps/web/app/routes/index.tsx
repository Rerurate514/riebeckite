import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { config } from "../config";
import { content } from "../content";
import Backlinks from "../features/backlinks/backlinks";
import { getPublishedBacklinks } from "../features/backlinks/backlinks.server";
import RecentPosts from "../features/recent-posts/recent-posts";
import { getRecentPosts } from "../features/recent-posts/recent-posts.server";
import TableOfContents, {
  extractTableOfContents,
} from "../features/table-of-contents/table-of-contents";
import { buildIndexSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post?.frontmatter)) {
    return c.notFound();
  }
  const [backlinks, recentPosts] = await Promise.all([
    getPublishedBacklinks("index"),
    getRecentPosts(),
  ]);
  const tableOfContents = extractTableOfContents(post.html ?? "");
  c.set("seo", buildIndexSeo(post));

  return c.render(
    <Article
      content={post}
      asideContent={
        <TableOfContents
          className="table-of-contents--desktop"
          items={tableOfContents}
        />
      }
      afterContent={<RecentPosts posts={recentPosts} />}
      footerContent={<Backlinks backlinks={backlinks} />}
    />,
  );
});
