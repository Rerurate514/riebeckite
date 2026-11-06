import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { Properties } from "@riebeckite/plugin-properties";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { PoweredByRiebeckite } from "./powered-by-riebeckite";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <div class="site-article__layout">
        <aside class="site-article__aside">
          <Breadcrumbs />
          <Properties />
          <TableOfContents placement="desktop-rail" />
        </aside>
        <ArticleContent>
          <ArticleBody />
          <PoweredByRiebeckite />
          <RecentPosts />
          <ArticleFooter class="site-article__footer">
            <Backlinks />
            <RelatedPosts />
          </ArticleFooter>
        </ArticleContent>
      </div>
    </Article>
  );
}
