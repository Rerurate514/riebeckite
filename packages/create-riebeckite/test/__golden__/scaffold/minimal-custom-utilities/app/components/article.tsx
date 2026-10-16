import type { PostContent } from "@riebeckite/core";
import { Article, ArticleBody, ArticleContent } from "@riebeckite/honox/ui";

export function SiteArticle({ post }: { post: PostContent }) {
  return (
    <Article class="site-article">
      <ArticleContent>
        <ArticleBody html={post.html ?? ""} />
      </ArticleContent>
    </Article>
  );
}
