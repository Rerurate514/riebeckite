import type { PostContent } from "@riebeckite/core";
import { Article, ArticleBody, ArticleContent, ArticleFooter } from "@riebeckite/honox/ui";

type SiteArticleProps = {
  post: PostContent;
  header?: unknown;
  metadata?: unknown;
  aside?: unknown;
  afterContent?: unknown;
  footer?: unknown;
};

export function SiteArticle(props: SiteArticleProps) {
  return (
    <Article class="site-article">
      <div class="site-article__layout">
        <ArticleContent>
          {props.header}
          {props.metadata}
          <ArticleBody html={props.post.html ?? ""} />
          {props.afterContent}
          {props.footer ? (
            <ArticleFooter class="site-article__footer">
              {props.footer}
            </ArticleFooter>
          ) : null}
        </ArticleContent>
        {props.aside ? <aside class="site-article__aside">{props.aside}</aside> : null}
      </div>
    </Article>
  );
}
