import type { PostContent, PublicContentEntry } from "@riebeckite/core";
import { Article, ArticleBody, ArticleContent } from "@riebeckite/honox/ui";

export function SiteArticle({ post, entry }: { post: PostContent; entry: PublicContentEntry }) {
  return (
    <Article class="site-article" post={post} entry={entry}>
      <ArticleContent>
        <ArticleBody />
      </ArticleContent>
    </Article>
  );
}
