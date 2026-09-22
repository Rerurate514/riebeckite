import type { PostContent } from "@riebeckite/core";

export type ArticleBacklink = {
  slug: string;
  title: string;
};

type Props = {
  content: PostContent;
  backlinks?: ArticleBacklink[];
};

type TableOfContentsItem = {
  id: string;
  level: number;
  title: string;
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

function TableOfContents(props: {
  className: string;
  items: TableOfContentsItem[];
}) {
  if (props.items.length < 2) return null;

  return (
    <aside class={`table-of-contents ${props.className}`} aria-label="Contents">
      <p class="table-of-contents__eyebrow">CONTENTS</p>
      <ol class="table-of-contents__list">
        {props.items.map((item) => (
          <li
            class={`table-of-contents__item table-of-contents__item--level-${item.level}`}
            key={item.id}
          >
            <a
              class="table-of-contents__link"
              href={`#${item.id}`}
              data-toc-target={item.id}
              data-toc-viewed="false"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </aside>
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

function Backlinks(props: { backlinks: ArticleBacklink[] }) {
  if (props.backlinks.length === 0) return null;

  return (
    <footer class="article-backlinks max-w-4xl mx-auto px-4">
      <p class="article-backlinks__eyebrow">Backlinks</p>
      <ul class="article-backlinks__list">
        {props.backlinks.map((backlink) => (
          <li class="article-backlinks__item" key={backlink.slug}>
            <a class="article-backlinks__link" href={`/${backlink.slug}`}>
              {backlink.title}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}

function extractTableOfContents(html: string): TableOfContentsItem[] {
  const headingPattern = /<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/g;
  const idPattern = /\bid="([^"]+)"/;
  const items: TableOfContentsItem[] = [];

  for (const match of html.matchAll(headingPattern)) {
    const [, level, attributes, innerHtml] = match;
    const id = attributes.match(idPattern)?.[1];

    if (!id) continue;

    items.push({
      id,
      level: Number(level),
      title: decodeHtmlEntities(stripHtml(innerHtml)).trim(),
    });
  }

  return items.filter((item) => item.title.length > 0);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
