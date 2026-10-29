import { SiteNav } from "@riebeckite/plugin-navigation";
import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { Drawer, DrawerTrigger } from "@riebeckite/layouts";
import { SiteHeader } from "./site-header";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <div class="site-shell">
        <SiteHeader />
        <div class="site-layout">
          <aside class="site-sidebar" aria-label="Documentation">
            <DocsSidebar />
          </aside>
          <main id="main-content" tabindex={-1} class="site-main">
            <div class="site-content">
              <ArticleContent>
                <Breadcrumbs />
                <ArticleBody />
                <ArticleFooter class="site-article__footer">
                  <DocsPrevNext />
                </ArticleFooter>
              </ArticleContent>
            </div>
          </main>
          <aside class="site-aside" aria-label="Table of contents">
            <TableOfContents className="rr-table-of-contents--desktop" />
          </aside>
        </div>
        <Drawer id="docs-navigation" label="Documentation">
          <SiteNav placement="primary" omitHome />
          <DocsSidebar />
        </Drawer>
        <DrawerTrigger
          controls="docs-navigation"
          label="Menu"
          icon="menu"
          class="site-menu-trigger"
        />
      </div>
    </Article>
  );
}
