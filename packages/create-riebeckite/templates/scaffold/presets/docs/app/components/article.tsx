import { SiteNav } from "@riebeckite/plugin-navigation";
import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { TableOfContents } from "@riebeckite/plugin-toc";
import {
  ShellAside,
  ShellBody,
  ContentContainer,
  Drawer,
  DrawerTrigger,
  ShowAt,
  ShellMain,
  ShellSidebar,
  SiteShell,
} from "@riebeckite/layouts";
import { SiteHeader } from "./site-header";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <SiteShell>
        <SiteHeader sticky>
          <DrawerTrigger
            controls="docs-navigation"
            label="Menu"
            icon="menu"
          />
        </SiteHeader>
        <ShellBody>
          <ShellSidebar at="md">
            <Drawer
              id="docs-navigation"
              label="Documentation"
              desktop="inline"
              at="md"
            >
              <ShowAt max="sm">
                <SiteNav placement="primary" omitHome />
              </ShowAt>
              <DocsSidebar />
            </Drawer>
          </ShellSidebar>
          <ShellMain id="main-content" tabindex={-1}>
            <ContentContainer>
              <ArticleContent>
                <Breadcrumbs />
                <ArticleBody />
                <ArticleFooter class="site-article__footer">
                  <DocsPrevNext />
                </ArticleFooter>
              </ArticleContent>
            </ContentContainer>
          </ShellMain>
          <ShellAside at="lg">
            <TableOfContents className="rr-table-of-contents--desktop" />
          </ShellAside>
        </ShellBody>
      </SiteShell>
    </Article>
  );
}
