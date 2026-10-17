import type { PostContent, PublicContentEntry } from "@riebeckite/core";
import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DailyNotes } from "@riebeckite/plugin-daily-notes";
import { Properties } from "@riebeckite/plugin-properties";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { ShareControls } from "@riebeckite/plugin-share";
import { TableOfContents } from "@riebeckite/plugin-toc";

type SiteArticleProps = {
  post: PostContent;
  entry: PublicContentEntry;
};

export function SiteArticle(props: SiteArticleProps) {
  return (
    <Article class="site-article" post={props.post} entry={props.entry}>
      <div class="site-article__layout">
        <ArticleContent>
          <Breadcrumbs />
          <Properties />
          <ArticleBody />
          <RecentPosts />
          <DailyNotes />
          <ArticleFooter class="site-article__footer">
            <ShareControls />
            <Backlinks />
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
