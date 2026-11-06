import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { SearchBar } from "@riebeckite/plugin-search";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { SiteDrawerNavigation, SiteHeader } from "./site-header";
import { PoweredByRiebeckite } from "./powered-by-riebeckite";

export function SiteArticle() {
  return (
    <div class="site-shell site-shell--docs">
      <SiteHeader>
        <div data-spa-region="site-header" class="site-header__region">
          <ColorModeToggle />
          <SearchBar class="rr-search-bar--header" />
          <DrawerTrigger controls="docs-navigation" label="Menu" icon="menu" />
        </div>
      </SiteHeader>
      <div class="site-layout">
        <aside class="site-sidebar" aria-label="Documentation">
          <div data-spa-region="docs-navigation">
            <DocsSidebar />
          </div>
        </aside>
        <main id="main-content" tabindex={-1} class="site-main">
          <div class="site-content">
            <Article class="site-article">
              <ArticleContent>
                <Breadcrumbs />
                <ArticleBody />
                <PoweredByRiebeckite />
                <ArticleFooter class="site-article__footer">
                  <DocsPrevNext />
                </ArticleFooter>
              </ArticleContent>
            </Article>
          </div>
        </main>
        <aside class="site-aside" aria-label="Table of contents">
          <div data-spa-region="toc">
            <TableOfContents
              borders={{ blockStart: false, blockEnd: false }}
              className="rr-table-of-contents--desktop"
            />
          </div>
        </aside>
      </div>
      <Drawer id="docs-navigation" label="Documentation">
        <div data-spa-region="docs-navigation-mobile">
          <SiteDrawerNavigation />
          <DocsSidebar />
        </div>
      </Drawer>
    </div>
  );
}
