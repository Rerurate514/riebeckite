import type { DocsNavigationItem, DocsNavigationLink } from "./types.js";

export function renderDocsSidebar(context: {
  readonly items: readonly DocsNavigationItem[];
  readonly currentPermalink: string;
  readonly label: string;
}): string {
  if (context.items.length === 0) return "";
  return `<nav class="rb-docs-sidebar" aria-label="${escapeAttribute(context.label)}" data-docs-sidebar>${renderItems(context.items, context.currentPermalink, 1)}</nav>`;
}

export function renderDocsPrevNext(
  sequence: readonly DocsNavigationLink[],
  currentPermalink: string,
): string {
  const index = sequence.findIndex((item) => item.href === currentPermalink);
  if (index < 0) return "";
  const previous = sequence[index - 1];
  const next = sequence[index + 1];
  if (!previous && !next) return "";
  return `<nav class="rb-docs-prev-next" aria-label="Previous and next docs pages" data-docs-prev-next>${renderPrevNextLink(previous, "previous")} ${renderPrevNextLink(next, "next")}</nav>`;
}

function renderItems(
  items: readonly DocsNavigationItem[],
  currentPermalink: string,
  level: number,
): string {
  return `<ul class="rb-docs-sidebar__list rb-docs-sidebar__list--level-${level}" data-docs-level="${level}">${items.map((item) => renderItem(item, currentPermalink, level)).join("")}</ul>`;
}

function renderItem(
  item: DocsNavigationItem,
  currentPermalink: string,
  level: number,
): string {
  const isCurrent = item.href === currentPermalink;
  const children =
    item.children.length > 0
      ? renderItems(item.children, currentPermalink, level + 1)
      : "";
  const collapsed = item.collapsed === true;
  const state =
    item.children.length > 0
      ? ` data-docs-collapsed="${collapsed ? "true" : "false"}"`
      : "";
  return `<li class="rb-docs-sidebar__item rb-docs-sidebar__item--level-${level}" data-docs-level="${level}"${state}>${renderItemLabel(item, isCurrent)}${children}</li>`;
}

function renderItemLabel(item: DocsNavigationItem, isCurrent: boolean): string {
  const current = isCurrent ? ' aria-current="page"' : "";
  if (!item.href)
    return `<span class="rb-docs-sidebar__section" data-docs-section>${escapeHtml(item.title)}</span>`;
  return `<a class="rb-docs-sidebar__link" href="${escapeAttribute(item.href)}" data-docs-link${current}>${escapeHtml(item.title)}</a>`;
}

function renderPrevNextLink(
  item: DocsNavigationLink | undefined,
  rel: "previous" | "next",
): string {
  if (!item)
    return `<span class="rb-docs-prev-next__spacer" aria-hidden="true"></span>`;
  const label = rel === "previous" ? "Previous" : "Next";
  const arrow = rel === "previous" ? "←" : "→";
  return `<a class="rb-docs-prev-next__link rb-docs-prev-next__link--${rel}" href="${escapeAttribute(item.href)}" data-docs-${rel}><span class="rb-docs-prev-next__label">${label}</span><span class="rb-docs-prev-next__title">${rel === "previous" ? `${arrow} ` : ""}${escapeHtml(item.title)}${rel === "next" ? ` ${arrow}` : ""}</span></a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
