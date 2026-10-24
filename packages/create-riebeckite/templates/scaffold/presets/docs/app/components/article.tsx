import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <div class="site-article__layout">
        <aside class="site-article__sidebar">
          <DocsSidebar />
        </aside>
        <ArticleContent>
          <Breadcrumbs />
          <ArticleBody />
          <ArticleFooter class="site-article__footer">
            <DocsPrevNext />
          </ArticleFooter>
        </ArticleContent>
        <aside class="site-article__aside">
          <TableOfContents className="rr-table-of-contents--desktop" />
        </aside>
      </div>
    </Article>
  );
}
