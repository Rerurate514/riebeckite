import {
  type ContentBodySlots,
  calculateReadingTime,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
import {
  ArticleBody,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  Article as ArticlePrimitive,
  ContentSlot,
  hasSlot,
} from "@riebeckite/honox/ui";
import ArticleFrontmatter from "../article-frontmatter/article-frontmatter";

type Props = {
  content: PostContent;
  /**
   * The note's resolved title (frontmatter `title`, else slug). Used as the
   * header heading when the body has no leading `<h1>`.
   */
  title?: string;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
  bodySlots?: ContentBodySlots;
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const articleHtml = splitAfterFirstHeading(html);
  const readingTimeMinutes = calculateReadingTime(html);
  // Notes often carry their title as a `title` property or filename rather
  // than a leading `#` heading. Without an h1 the extracted lead is empty, so
  // synthesize one from the resolved title to keep the article header intact.
  const leadHtml = articleHtml.lead || renderTitleHeading(props.title);

  return (
    <ArticlePrimitive>
      <ArticleLayout>
        {props.asideContent}
        <ContentSlot
          slots={props.bodySlots}
          name="article.aside"
          class="rb-article-aside"
        />
        <ArticleContent>
          <ContentSlot slots={props.bodySlots} name="article.header" />
          <ArticleHeader dangerouslySetInnerHTML={{ __html: leadHtml }} />
          <ContentSlot slots={props.bodySlots} name="article.metadata" />
          <ArticleFrontmatter
            frontmatter={props.content.frontmatter}
            readingTimeMinutes={readingTimeMinutes}
          />
          <ContentSlot slots={props.bodySlots} name="article.before-content" />
          <ArticleBody html={articleHtml.rest} />
          {props.afterContent}
          <ContentSlot slots={props.bodySlots} name="article.after-content" />
        </ArticleContent>
        {(hasSlot(props.bodySlots, "article.footer") ||
          props.footerContent) && (
          <div class="rb-article-outro">
            <ContentSlot slots={props.bodySlots} name="article.footer" />
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
