import { Article, ArticleBody, ArticleContent } from "@riebeckite/honox/ui";
import { PoweredByRiebeckite } from "./powered-by-riebeckite";

export function SiteArticle() {
  return (
    <Article class="site-article">
      <ArticleContent>
        <ArticleBody />
        <PoweredByRiebeckite />
      </ArticleContent>
    </Article>
  );
}
