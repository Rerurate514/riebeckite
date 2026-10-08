import type { TableOfContentsItem } from "../src/table-of-contents.js";

type Props = {
  className: string;
  items: TableOfContentsItem[];
};

export default function TableOfContents(props: Props) {
  if (props.items.length < 2) return null;

  return (
    <aside
      class={`rr-table-of-contents ${props.className}`}
      aria-label="Contents"
    >
      <p class="rr-table-of-contents__eyebrow">CONTENTS</p>
      <ol class="rr-table-of-contents__list">
        {props.items.map((item) => (
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
