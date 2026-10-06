import type { ContentBodySlots, PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleLayout,
  ContentSlot,
} from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  bodySlots,
  asideContent,
}: {
  post: PostContent;
  bodySlots?: ContentBodySlots;
  asideContent?: unknown;
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

          <ContentSlot slots={bodySlots} name="article.after-content" />
        </ArticleContent>

        <ContentSlot
          slots={bodySlots}
          name="article.footer"
          class="site-article__footer"
        />
      </ArticleLayout>
    </Article>
  );
}
