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
  const panel = bodySlots?.properties ?? "";

  return (
    <Article class="fixture-article">
      <ArticleLayout>
        <ArticleContent>
          <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
          {panel ? (
            <div
              class="article-properties"
              dangerouslySetInnerHTML={{ __html: panel }}
            />
          ) : null}
          <ArticleMeta />
          <div dangerouslySetInnerHTML={{ __html: rest }} />
        </ArticleContent>
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
