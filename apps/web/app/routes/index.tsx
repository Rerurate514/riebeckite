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
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post?.frontmatter)) {
    return c.notFound();
  }
  const [backlinks, recentPosts] = await Promise.all([
    getPublishedBacklinks({
      manifest,
      config,
      slug: "index",
      resolveTitle: getArticleTitle,
    }),
    getRecentPosts({
      posts: manifest.entries,
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
