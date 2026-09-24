/** @jsxImportSource hono/jsx */
import type { TableOfContentsItem } from "../src/table-of-contents";

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
