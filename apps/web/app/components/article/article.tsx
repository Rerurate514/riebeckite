import { calculateReadingTime, type PostContent } from "@riebeckite/core";
import {
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  Article as ArticlePrimitive,
} from "@riebeckite/honox/ui";
import ArticleFrontmatter from "../article-frontmatter/article-frontmatter";
import ContentSlot from "../content-slot/content-slot";

type Props = {
  content: PostContent;
  propertiesHtml?: string;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
  bodySlots?: Readonly<Record<string, string>>;
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const articleHtml = splitAfterFirstHeading(html);
  const readingTimeMinutes = calculateReadingTime(html);
  const propertiesHtml = props.propertiesHtml ?? "";

  return (
    <ArticlePrimitive class="prose">
      <ArticleLayout>
        {props.asideContent}
        <ArticleContent>
          <ArticleHeader
            dangerouslySetInnerHTML={{ __html: articleHtml.lead }}
          />
          <ContentSlot html={props.bodySlots?.["article.after-header"]} />
          {propertiesHtml ? (
            <div
              class="article-properties"
              dangerouslySetInnerHTML={{ __html: propertiesHtml }}
            />
          ) : null}
          <ArticleFrontmatter
            frontmatter={props.content.frontmatter}
            readingTimeMinutes={readingTimeMinutes}
          />
          <ContentSlot html={props.bodySlots?.["article.after-meta"]} />
          <ContentSlot html={props.bodySlots?.["article.before-content"]} />
          <div dangerouslySetInnerHTML={{ __html: articleHtml.rest }} />
          {props.afterContent}
          <ContentSlot html={props.bodySlots?.["article.after-content"]} />
        </ArticleContent>
      </ArticleLayout>
      <ContentSlot html={props.bodySlots?.["article.footer"]} />
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
