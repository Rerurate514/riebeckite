import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function FixtureArticle({ post }: { post: PostContent }) {
  return (
    <Article class="fixture-article">
      <ArticleLayout>
        <ArticleContent>
          <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
        </ArticleContent>
      </ArticleLayout>
    </Article>
  );
}
