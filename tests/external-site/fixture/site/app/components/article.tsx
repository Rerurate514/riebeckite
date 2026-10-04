import type { PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
} from "@riebeckite/honox/ui";

type Props = {
  post: PostContent;
  bodySlots?: Readonly<Record<string, string>>;
};

export function FixtureArticle({ post, bodySlots }: Props) {
  const { lead, rest } = splitAfterFirstHeading(post.html ?? "");

  return (
    <Article class="fixture-article">
      <ArticleLayout>
        {bodySlots?.["article.aside"] ? (
          <div
            class="fixture-article__aside"
            dangerouslySetInnerHTML={{ __html: bodySlots["article.aside"] }}
          />
        ) : null}
        <ArticleContent>
          {bodySlots?.["article.header"] ? (
            <div
              class="fixture-article__header"
              dangerouslySetInnerHTML={{
                __html: bodySlots["article.header"],
              }}
            />
          ) : null}
          <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
          {bodySlots?.["article.metadata"] ? (
            <div
              class="fixture-article__metadata"
              dangerouslySetInnerHTML={{
                __html: bodySlots["article.metadata"],
              }}
            />
          ) : null}
          <ArticleMeta />
          {bodySlots?.["article.before-content"] ? (
            <div
              class="fixture-article__before-content"
              dangerouslySetInnerHTML={{
                __html: bodySlots["article.before-content"],
              }}
            />
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: rest }} />
          {bodySlots?.["article.after-content"] ? (
            <div
              class="fixture-article__after-content"
              dangerouslySetInnerHTML={{
                __html: bodySlots["article.after-content"],
              }}
            />
          ) : null}
        </ArticleContent>
        {bodySlots?.["article.footer"] ? (
          <div
            class="fixture-article__footer"
            dangerouslySetInnerHTML={{ __html: bodySlots["article.footer"] }}
          />
        ) : null}
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
