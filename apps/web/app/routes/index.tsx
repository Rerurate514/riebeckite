import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { getPublishedBacklinks } from "../components/backlinks/backlinks.server";
import RecentPosts from "../components/recent-posts/recent-posts";
import { getRecentPosts } from "../components/recent-posts/recent-posts.server";
import { config } from "../config";
import { content } from "../content";

export default createRoute(async (c) => {
  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post?.frontmatter)) {
    return c.notFound();
  }
  const [backlinks, recentPosts] = await Promise.all([
    getPublishedBacklinks("index"),
    getRecentPosts(),
  ]);
  return c.render(
    <Article
      content={post}
      backlinks={backlinks}
      afterContent={<RecentPosts posts={recentPosts} />}
    />,
  );
});
