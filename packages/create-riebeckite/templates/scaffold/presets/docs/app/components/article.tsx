import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { TableOfContents } from "@riebeckite/plugin-toc";
import {
  ShellAside,
  ShellBody,
  ShellDrawer,
  ShellHeader,
  ShellMain,
  ShellSidebar,
  SiteShell,
} from "@riebeckite/shell-ui";
import { SiteHeader } from "./site-header";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <SiteShell variant="docs">
        <ShellHeader sticky>
          <SiteHeader />
          <ShellDrawer label="Documentation">
            <DocsSidebar />
          </ShellDrawer>
        </ShellHeader>
        <ShellBody>
          <ShellSidebar>
            <DocsSidebar />
          </ShellSidebar>
          <ShellMain id="main-content" tabindex={-1}>
            <ArticleContent>
              <Breadcrumbs />
              <ArticleBody />
              <ArticleFooter class="site-article__footer">
                <DocsPrevNext />
              </ArticleFooter>
            </ArticleContent>
          </ShellMain>
          <ShellAside>
            <TableOfContents className="rr-table-of-contents--desktop" />
          </ShellAside>
        </ShellBody>
      </SiteShell>
    </Article>
  );
}
