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
  const permalink = currentPermalink ?? "";
  return (
    <details class="rb-docs-sidebar-details" data-docs-sidebar-details open>
      <summary class="rb-docs-sidebar-summary">{label}</summary>
      <nav class="rb-docs-sidebar" aria-label={label} data-docs-sidebar>
        <DocsSidebarItems
          items={items}
          currentPermalink={permalink}
          level={1}
        />
      </nav>
    </details>
  );
}) satisfies PluginComponent<DocsSidebarProps>;

function DocsSidebarItems({
  items,
  currentPermalink,
  level,
}: {
  readonly items: readonly DocsNavigationItem[];
  readonly currentPermalink: string;
  readonly level: number;
}) {
  return (
    <ul
      class={`rb-docs-sidebar__list rb-docs-sidebar__list--level-${level}`}
      data-docs-level={String(level)}
    >
      {items.map((item) => (
        <DocsSidebarItem
          item={item}
          currentPermalink={currentPermalink}
          level={level}
          key={item.slug ?? item.title}
        />
      ))}
    </ul>
  );
}

function DocsSidebarItem({
  item,
  currentPermalink,
  level,
}: {
  readonly item: DocsNavigationItem;
  readonly currentPermalink: string;
  readonly level: number;
}) {
  const isCurrent = item.href === currentPermalink;
  const isCurrentBranch = item.children.some((child) =>
    containsPermalink(child, currentPermalink),
  );
  const collapsed = item.collapsed === true && !isCurrent && !isCurrentBranch;
  return (
    <li
      class={`rb-docs-sidebar__item rb-docs-sidebar__item--level-${level}`}
      data-docs-level={String(level)}
      data-docs-collapsed={
        item.children.length > 0 ? String(collapsed) : undefined
      }
    >
      {item.href ? (
        <a
          class="rb-docs-sidebar__link"
          href={item.href}
          data-docs-link
          aria-current={isCurrent ? "page" : undefined}
        >
          {item.title}
        </a>
      ) : (
        <span class="rb-docs-sidebar__section" data-docs-section>
          {item.title}
        </span>
      )}
      {item.children.length > 0 ? (
        <DocsSidebarItems
          items={item.children}
          currentPermalink={currentPermalink}
          level={level + 1}
        />
      ) : null}
    </li>
  );
}

function containsPermalink(
  item: DocsNavigationItem,
  currentPermalink: string,
): boolean {
  return (
    item.href === currentPermalink ||
    item.children.some((child) => containsPermalink(child, currentPermalink))
  );
}

export default DocsSidebar;
