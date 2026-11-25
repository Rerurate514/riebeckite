import { useArticleContext, useUiLabels } from "@riebeckite/ui";
import { tocLabels } from "../src/labels.js";
import type { TableOfContentsItem } from "../src/table-of-contents.js";
import { extractTableOfContents } from "../src/table-of-contents.js";

export type TableOfContentsProps = {
  borders?: Readonly<{
    blockStart?: boolean;
    blockEnd?: boolean;
  }>;
  className?: string;
  items?: readonly TableOfContentsItem[];
  placement?: "inline" | "desktop-rail";
};

export default function TableOfContents(props: TableOfContentsProps) {
  const article = useArticleContext();
  const labels = useUiLabels(tocLabels);
  const items =
    props.items ??
    (article ? extractTableOfContents(article.post.html ?? "") : undefined);
  if (!items || items.length < 2) return null;
  const className = [
    props.placement === "desktop-rail"
      ? "rr-table-of-contents--desktop-rail"
      : "",
    props.borders?.blockStart === false
      ? "rr-table-of-contents--without-top-border"
      : "",
    props.borders?.blockEnd === false
      ? "rr-table-of-contents--without-bottom-border"
      : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      class={`rr-table-of-contents ${className}`}
      aria-label={labels.contents}
    >
      <p class="rr-table-of-contents__eyebrow">{labels.contentsHeading}</p>
      <ol class="rr-table-of-contents__list">
        {items.map((item) => (
          <li
            class={`rr-table-of-contents__item rr-table-of-contents__item--level-${item.level}`}
            key={item.id}
          >
            <a
              class="rr-table-of-contents__link"
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
