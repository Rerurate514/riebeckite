/** @jsxImportSource hono/jsx */
export type TableOfContentsItem = {
  id: string;
  level: number;
  title: string;
};

type Props = {
  className: string;
  items: TableOfContentsItem[];
};

export default function TableOfContents(props: Props) {
  if (props.items.length < 2) return null;

  return (
    <aside
      class={`table-of-contents rr-table-of-contents ${props.className}`}
      aria-label="Contents"
    >
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

export function extractTableOfContents(html: string): TableOfContentsItem[] {
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
