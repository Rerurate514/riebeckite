import type { ContentBodySlots, PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleFooter,
  ArticleLayout,
  ContentSlot,
  hasSlot,
} from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  bodySlots,
  asideContent,
  afterContent,
  footerContent,
}: {
  post: PostContent;
  bodySlots?: ContentBodySlots;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        {asideContent}

        <ContentSlot
          slots={bodySlots}
          name="article.aside"
          class="site-article__aside"
        />

        <ArticleContent>
          <ContentSlot slots={bodySlots} name="article.header" />
          <ContentSlot slots={bodySlots} name="article.metadata" />
          <ContentSlot slots={bodySlots} name="article.before-content" />

          <ArticleBody html={post.html ?? ""} />

          {afterContent}

          <ContentSlot slots={bodySlots} name="article.after-content" />
        </ArticleContent>

        {hasSlot(bodySlots, "article.footer") || footerContent ? (
          <ArticleFooter class="site-article__footer">
            <ContentSlot slots={bodySlots} name="article.footer" />
            {footerContent}
          </ArticleFooter>
        ) : null}
      </ArticleLayout>
    </Article>
  );
}
