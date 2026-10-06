import type { ContentBodySlots, PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
  ContentSlot,
} from "@riebeckite/honox/ui";

type Props = {
  post: PostContent;
  bodySlots?: ContentBodySlots;
};

export function FixtureArticle({ post, bodySlots }: Props) {
  const { lead, rest } = splitAfterFirstHeading(post.html ?? "");

  return (
    <Article class="fixture-article">
      <ArticleLayout>
        <ContentSlot
          slots={bodySlots}
          name="article.aside"
          class="fixture-article__aside"
        />
        <ArticleContent>
          <ContentSlot
            slots={bodySlots}
            name="article.header"
            class="fixture-article__header"
          />
          <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
          <ContentSlot
            slots={bodySlots}
            name="article.metadata"
            class="fixture-article__metadata"
          />
          <ArticleMeta />
          <ContentSlot
            slots={bodySlots}
            name="article.before-content"
            class="fixture-article__before-content"
          />
          <ArticleBody html={rest} />
          <ContentSlot
            slots={bodySlots}
            name="article.after-content"
            class="fixture-article__after-content"
          />
        </ArticleContent>
        <ContentSlot
          slots={bodySlots}
          name="article.footer"
          class="fixture-article__footer"
        />
      </ArticleLayout>
    </Article>
  );
}

function splitAfterFirstHeading(html: string): { lead: string; rest: string } {
  const firstHeading = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/);

  if (!firstHeading || firstHeading.index === undefined) {
    return { lead: "", rest: html };
  }

  const splitIndex = firstHeading.index + firstHeading[0].length;

  return {
    lead: html.slice(0, splitIndex),
    rest: html.slice(splitIndex),
  };
}
