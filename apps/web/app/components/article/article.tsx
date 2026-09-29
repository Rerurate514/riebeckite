import {
  calculateReadingTime,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
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
  title?: string;
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
  // Notes often carry their title as a `title` property or filename rather
  // than a leading `#` heading. Without an h1 the extracted lead is empty, so
  // synthesize one from the resolved title to keep the article header intact.
  const leadHtml = articleHtml.lead || renderTitleHeading(props.title);

  return (
    <ArticlePrimitive class="prose">
      <ArticleLayout>
        {props.asideContent}
        <ArticleContent>
          <ArticleHeader dangerouslySetInnerHTML={{ __html: leadHtml }} />
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
        {(props.bodySlots?.["article.footer"] || props.footerContent) && (
          <div class="article-shell__outro">
            <ContentSlot html={props.bodySlots?.["article.footer"]} />
            {props.footerContent}
          </div>
        )}
      </ArticleLayout>
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

/** Renders the resolved note title as the article h1 when the content has none. */
function renderTitleHeading(title: string | undefined): string {
  const trimmed = title?.trim();
  return trimmed ? `<h1>${escapeHtml(trimmed)}</h1>` : "";
}
