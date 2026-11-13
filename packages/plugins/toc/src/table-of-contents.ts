import { htmlToPlainText } from "@riebeckite/core";

export type TableOfContentsItem = {
  id: string;
  level: number;
  title: string;
};

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
      title: htmlToPlainText(innerHtml),
    });
  }

  return items.filter((item) => item.title.length > 0);
}
