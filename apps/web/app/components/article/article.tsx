import {
  escapeHtml,
  type PostContent,
  type PublicContentEntry,
} from "@riebeckite/core";
import {
  ArticleBody,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  Article as ArticlePrimitive,
} from "@riebeckite/honox/ui";
import ArticleMetadata from "@riebeckite/plugin-article-metadata/components";

type Props = {
  content: PostContent;
  entry?: PublicContentEntry;
  /**
   * The note's resolved title (frontmatter `title`, else slug). Used as the
   * header heading when the body has no leading `<h1>`.
   */
  title?: string;
  /** Breadcrumb trail (and any other header furniture) above the title. */
  headerContent?: unknown;
  /** Reading metadata such as the properties panel, next to the title. */
  metadataContent?: unknown;
  /** Primary table of contents rail rendered in its own grid column. */
  asideContent?: unknown;
  /** Secondary aside content, such as the docs sidebar, next to the article. */
  articleAside?: unknown;
  /** Content injected before the article body, such as share controls. */
  beforeContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const articleHtml = splitAfterFirstHeading(html);
  // Notes often carry their title as a `title` property or filename rather
  // than a leading `#` heading. Without an h1 the extracted lead is empty, so
  // synthesize one from the resolved title to keep the article header intact.
  const leadHtml = articleHtml.lead || renderTitleHeading(props.title);

  return (
    <ArticlePrimitive post={props.content} entry={props.entry}>
      <ArticleLayout>
        {props.asideContent}
        {props.articleAside}
        <ArticleContent>
          {props.headerContent}
          <ArticleHeader dangerouslySetInnerHTML={{ __html: leadHtml }} />
          {props.metadataContent}
          <ArticleMetadata locale="ja-JP" />
          {props.beforeContent}
          <ArticleBody html={articleHtml.rest} />
          {props.afterContent}
        </ArticleContent>
        {props.footerContent && (
          <div class="rb-article-outro">{props.footerContent}</div>
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
