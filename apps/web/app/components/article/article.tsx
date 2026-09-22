import type { PostContent } from "@riebeckite/core";
import { calculateReadingTime } from "../../lib/seo";
import ArticleFrontmatter from "../article-frontmatter/article-frontmatter";
import Backlinks, { type ArticleBacklink } from "../backlinks/backlinks";
import TableOfContents, {
  extractTableOfContents,
} from "../table-of-contents/table-of-contents";

type Props = {
  content: PostContent;
  backlinks?: ArticleBacklink[];
  afterContent?: unknown;
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const tableOfContents = extractTableOfContents(html);
  const articleHtml = splitAfterFirstHeading(html);
  const readingTimeMinutes = calculateReadingTime(html);

  return (
    <article class="article-shell prose" data-slot="article">
      <div class="article-shell__layout">
        <TableOfContents
          className="table-of-contents--desktop"
          items={tableOfContents}
        />
        <div class="article-shell__body" data-slot="article-body">
          <div
            class="article-shell__lead"
            dangerouslySetInnerHTML={{ __html: articleHtml.lead }}
          />
          <ArticleFrontmatter
            frontmatter={props.content.frontmatter}
            readingTimeMinutes={readingTimeMinutes}
          />
          <div dangerouslySetInnerHTML={{ __html: articleHtml.rest }} />
          {props.afterContent}
        </div>
      </div>
      <Backlinks backlinks={props.backlinks ?? []} />
    </article>
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
