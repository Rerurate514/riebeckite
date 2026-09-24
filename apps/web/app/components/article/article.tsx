import type { PostContent } from "@riebeckite/core";
import {
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  Article as ArticlePrimitive,
} from "@riebeckite/honox/ui";
import { calculateReadingTime } from "../../lib/seo";
import ArticleFrontmatter from "../article-frontmatter/article-frontmatter";

type Props = {
  content: PostContent;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const articleHtml = splitAfterFirstHeading(html);
  const readingTimeMinutes = calculateReadingTime(html);

  return (
    <ArticlePrimitive class="prose">
      <ArticleLayout>
        {props.asideContent}
        <ArticleContent>
          <ArticleHeader
            dangerouslySetInnerHTML={{ __html: articleHtml.lead }}
          />
          <ArticleFrontmatter
            frontmatter={props.content.frontmatter}
            readingTimeMinutes={readingTimeMinutes}
          />
          <div dangerouslySetInnerHTML={{ __html: articleHtml.rest }} />
          {props.afterContent}
        </ArticleContent>
      </ArticleLayout>
      {props.footerContent}
    </ArticlePrimitive>
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
