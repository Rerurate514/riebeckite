import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  bodySlots,
  asideContent,
  afterContent,
  footerContent,
}: {
  post: PostContent;
  bodySlots?: Readonly<Record<string, string>>;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        {asideContent}
        {bodySlots?.["article.aside"] ? (
          <div
            class="site-article__aside"
            dangerouslySetInnerHTML={{ __html: bodySlots["article.aside"] }}
          />
        ) : null}
        <ArticleContent>
          {bodySlots?.["article.header"] ? (
            <div
              class="site-article__header"
              dangerouslySetInnerHTML={{ __html: bodySlots["article.header"] }}
            />
          ) : null}
          {bodySlots?.["article.metadata"] ? (
            <div
              class="site-article__metadata"
              dangerouslySetInnerHTML={{ __html: bodySlots["article.metadata"] }}
            />
          ) : null}
          {bodySlots?.["article.before-content"] ? (
            <div
              class="site-article__before-content"
              dangerouslySetInnerHTML={{ __html: bodySlots["article.before-content"] }}
            />
          ) : null}
          <div
            class="rb-article-content"
            dangerouslySetInnerHTML={{ __html: post.html ?? "" }}
          />
          {afterContent}
          {bodySlots?.["article.after-content"] ? (
            <div
              class="site-article__after-content"
              dangerouslySetInnerHTML={{ __html: bodySlots["article.after-content"] }}
            />
          ) : null}
        </ArticleContent>
        {bodySlots?.["article.footer"] || footerContent ? (
          <div class="site-article__footer">
            {bodySlots?.["article.footer"] ? (
              <div dangerouslySetInnerHTML={{ __html: bodySlots["article.footer"] }} />
            ) : null}
            {footerContent}
          </div>
        ) : null}
      </ArticleLayout>
    </Article>
  );
}
