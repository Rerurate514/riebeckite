import type { PluginComponent } from "@riebeckite/core";
import type { DocsNavigationItem } from "../src/types.js";

export type DocsSidebarProps = {
  readonly items: readonly DocsNavigationItem[];
  readonly currentPermalink?: string;
  readonly label?: string;
};

const DocsSidebar = (({
  items,
  currentPermalink,
  label = "Docs navigation",
}: Readonly<DocsSidebarProps>) => {
  if (items.length === 0) return null;
  return (
    <nav class="rr-docs-sidebar" aria-label={label}>
      <ol class="rr-docs-sidebar__list">
        {items.map((item) => (
          <DocsSidebarItem
            item={item}
            currentPermalink={currentPermalink}
            key={`${item.slug ?? item.title}`}
          />
        ))}
      </ol>
    </nav>
  );
}) satisfies PluginComponent<DocsSidebarProps>;

function DocsSidebarItem({
  item,
  currentPermalink,
}: {
  readonly item: DocsNavigationItem;
  readonly currentPermalink: string | undefined;
}) {
  const current = item.href === currentPermalink;
  return (
    <li class="rr-docs-sidebar__item">
      {item.href ? (
        <a href={item.href} aria-current={current ? "page" : undefined}>
          {item.title}
        </a>
      ) : (
        <span>{item.title}</span>
      )}
      {item.children.length > 0 ? (
        <ol class="rr-docs-sidebar__list">
          {item.children.map((child) => (
            <DocsSidebarItem
              item={child}
              currentPermalink={currentPermalink}
              key={`${child.slug ?? child.title}`}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export default DocsSidebar;
