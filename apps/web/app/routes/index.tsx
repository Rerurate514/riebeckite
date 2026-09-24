import { isPublished } from "@riebeckite/core";
import { Backlinks, getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { getRecentPosts, RecentPosts } from "@riebeckite/plugin-recent-posts";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";
import { buildIndexSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post?.frontmatter)) {
    return c.notFound();
  }
  const manifest = await content.getManifest();
  const [backlinks, recentPosts] = await Promise.all([
    getPublishedBacklinks({
      manifest,
      config,
      slug: "index",
      resolveTitle: getArticleTitle,
    }),
    getRecentPosts({
      posts: await content.getAllPosts(),
      config,
      getProcessedContent: (slug) => content.getProcessedContent(slug),
      resolveTitle: getArticleTitle,
    }),
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
