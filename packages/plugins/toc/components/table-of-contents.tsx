import { useArticleContext } from "@riebeckite/ui";
import type { TableOfContentsItem } from "../src/table-of-contents.js";
import { extractTableOfContents } from "../src/table-of-contents.js";

type Props = {
  bordered?: boolean;
  className?: string;
  items?: readonly TableOfContentsItem[];
  placement?: "inline" | "desktop-rail";
};

export default function TableOfContents(props: Props) {
  const article = useArticleContext();
  const items =
    props.items ??
    (article ? extractTableOfContents(article.post.html ?? "") : undefined);
  if (!items || items.length < 2) return null;
  const className = [
    props.placement === "desktop-rail"
      ? "rr-table-of-contents--desktop-rail"
      : "",
    props.bordered === false ? "rr-table-of-contents--borderless" : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside class={`rr-table-of-contents ${className}`} aria-label="Contents">
      <p class="rr-table-of-contents__eyebrow">CONTENTS</p>
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
