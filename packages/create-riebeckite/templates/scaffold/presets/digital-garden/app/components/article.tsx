import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { Properties } from "@riebeckite/plugin-properties";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { LocalGraph } from "@riebeckite/plugin-local-graph";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <div class="site-article__layout">
        <ArticleContent>
          <Breadcrumbs />
          <Properties />
          <ArticleBody />
          <RecentPosts />
          <ArticleFooter class="site-article__footer">
            <Backlinks />
            <LocalGraph />
            <RelatedPosts />
          </ArticleFooter>
        </ArticleContent>
        <aside class="site-article__aside">
          <TableOfContents className="rr-table-of-contents--desktop" />
        </aside>
      </div>
    </Article>
  );
}
