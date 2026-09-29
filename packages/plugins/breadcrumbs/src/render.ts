import {
  escapeHtml,
  escapeHtmlAttribute,
  type PluginHeadTag,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { BreadcrumbItem, ResolvedBreadcrumbsOptions } from "./types.js";
import { buildAbsoluteUrl } from "./url.js";

/** Boolean attribute that marks the generated navigation for tests and styling. */
export const BREADCRUMBS_ATTRIBUTE = "data-breadcrumbs";

/**
 * Renders the breadcrumb trail as a navigation landmark. Returns an empty
 * string when there is nothing to show, so callers can leave HTML untouched.
 */
export function renderBreadcrumbNav(
  items: readonly BreadcrumbItem[],
  options: ResolvedBreadcrumbsOptions,
): string {
  if (items.length === 0) return "";

  const className = escapeHtmlAttribute(options.className);
  const label = escapeHtmlAttribute(options.ariaLabel);
  const separator = escapeHtml(options.separator);
  const listItems = items
    .map((item, index) => {
      const isLast = index === items.length - 1;
      const crumb = isLast
        ? `<span class="${className}__current" aria-current="page">${escapeHtml(
            item.name,
          )}</span>`
        : `<a class="${className}__link" href="${escapeHtmlAttribute(
            item.url,
          )}">${escapeHtml(item.name)}</a>`;
      const trailing = isLast
        ? ""
        : `<span class="${className}__separator" aria-hidden="true">${separator}</span>`;
      return `<li class="${className}__item">${crumb}${trailing}</li>`;
    })
    .join("");

  return `<nav class="${className}" ${BREADCRUMBS_ATTRIBUTE} aria-label="${label}"><ol>${listItems}</ol></nav>`;
}

/**
 * Builds the BreadcrumbList schema.org JSON-LD object from the resolved
 * trail. Item URLs are made absolute against the configured site base URL.
 */
export function buildBreadcrumbJsonLd(
  config: ResolvedRiebeckiteConfig,
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(config, item.url),
    })),
  };
}

/**
 * Builds the BreadcrumbList JSON-LD `<script>` head tag so the Site shell can
 * render it in the document `<head>` (see the `headTags` entry mechanism).
 */
export function buildBreadcrumbHeadTag(
  schema: Record<string, unknown>,
): PluginHeadTag {
  return {
    tag: "script",
    attrs: { type: "application/ld+json" },
    children: JSON.stringify(schema),
  };
}

/**
 * True when the entry already carries a BreadcrumbList JSON-LD head tag, so
 * repeated plugin passes do not emit duplicates.
 */
export function hasBreadcrumbHeadTag(
  headTags: readonly PluginHeadTag[] | undefined,
): boolean {
  return (
    headTags?.some(
      (tag) =>
        tag.tag === "script" &&
        typeof tag.children === "string" &&
        tag.children.includes('"@type":"BreadcrumbList"'),
    ) ?? false
  );
}

/**
 * Places the completed navigation at the top of the note.
 *
 * When the HTML is a full page (it contains an `<article>` or `<body>` tag)
 * the nav is inserted right after that opening tag. The manifest `html` we
 * operate on is normally a content fragment the Site wraps in its own
 * `<article>`, in which case the nav is simply prepended so it renders above
 * the note's title.
 */
export function injectBreadcrumbNav(html: string, nav: string): string {
  if (nav === "" || html.includes(BREADCRUMBS_ATTRIBUTE)) return html;

  const article = /<article\b[^>]*>/i.exec(html);
  if (article) {
    const end = article.index + article[0].length;
    return `${html.slice(0, end)}${nav}${html.slice(end)}`;
  }

  const body = /<body\b[^>]*>/i.exec(html);
  if (body) {
    const end = body.index + body[0].length;
    return `${html.slice(0, end)}${nav}${html.slice(end)}`;
  }

  return `${nav}\n${html}`;
}
