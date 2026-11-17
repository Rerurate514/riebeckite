import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DailyNotes } from "@riebeckite/plugin-daily-notes";
import {
  resolveSiteNavigation,
  SidebarNavigation,
} from "@riebeckite/plugin-navigation";
import { Properties } from "@riebeckite/plugin-properties";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { ShareControls } from "@riebeckite/plugin-share";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { useSiteContext } from "@riebeckite/ui";
import { PoweredByRiebeckite } from "./powered-by-riebeckite";

export function SiteArticle() {
  const site = useSiteContext();
  const navigation = site
    ? resolveSiteNavigation(site.config, site.manifest, site.language)
    : null;

  return (
    <Article class="site-article">
      <div class="site-article__layout">
        <aside class="site-article__catalog">
          <p class="site-article__catalog-title">Catalog</p>
          <SidebarNavigation
            items={navigation?.primary ?? []}
            label="Catalog"
            collapsible
          />
        </aside>
        <ArticleContent>
          <Breadcrumbs />
          <Properties />
          <ArticleBody />
          <PoweredByRiebeckite />
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
