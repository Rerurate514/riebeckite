import type { PostContent } from "@riebeckite/core";
import Backlinks, { type ArticleBacklink } from "./backlinks";
import TableOfContents, { extractTableOfContents } from "./table-of-contents";

type Props = {
  content: PostContent;
  backlinks?: ArticleBacklink[];
};

export default function Article(props: Props) {
  const html = props.content.html ?? "";
  const tableOfContents = extractTableOfContents(html);
  const articleHtml = splitAfterFirstHeading(html);

  return (
    <article class="article-shell prose">
      <div class="article-shell__layout">
        <TableOfContents
          className="table-of-contents--desktop"
          items={tableOfContents}
        />
        <div class="article-shell__body max-w-4xl px-4">
          <div
            class="article-shell__lead"
            dangerouslySetInnerHTML={{ __html: articleHtml.lead }}
          />
          <div dangerouslySetInnerHTML={{ __html: articleHtml.rest }} />
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
