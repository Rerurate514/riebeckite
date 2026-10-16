import type { PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
} from "@riebeckite/honox/ui";

type Props = {
  post: PostContent;
};

export function FixtureArticle({ post }: Props) {
  const { lead, rest } = splitAfterFirstHeading(post.html ?? "");

  return (
    <Article class="fixture-article">
      <ArticleLayout>
        <ArticleContent>
          <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
          <ArticleMeta />
          <ArticleBody html={rest} />
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
