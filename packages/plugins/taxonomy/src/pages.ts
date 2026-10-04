import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { buildFeedHeadTags } from "./feeds.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyKind,
  TaxonomyPage,
  TaxonomyTerm,
} from "./types.js";

/**
 * Renders a taxonomy listing page fragment. The fragment owns the listing and
 * related-term navigation only; the Site's route and layout wrap it (see the
 * README for the documented app-route wiring).
 */
export function renderTaxonomyPage(
  term: TaxonomyTerm,
  options: ResolvedTaxonomyOptions,
): TaxonomyPage {
  const className = escapeHtmlAttribute(options.className);
  const entries = term.entries
    .map(
      (entry) =>
        `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(
          entry.permalink,
        )}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  const feeds = renderFeedLinks(term, className);
  const related = renderRelatedTerms(term, options);

  const html = `<section class="${className}" data-rr-taxonomy="${term.kind}" data-rr-taxonomy-value="${escapeHtmlAttribute(
    term.value,
  )}"><h1 class="${className}__title">${escapeHtml(term.title)}</h1><p class="${className}__count" data-rr-taxonomy-count="${term.entries.length}">${term.entries.length}</p>${feeds}<ul class="${className}__list">${entries}</ul>${related}</section>`;

  return {
    title: term.title,
    frontmatter: { title: term.title },
    html,
    headTags: buildFeedHeadTags(term),
  };
}

/** Renders only the related-term navigation for a tag term. */
export function renderRelatedTerms(
  term: TaxonomyTerm,
  options: ResolvedTaxonomyOptions,
): string {
  if (!options.related || term.kind !== "tag" || term.related.length === 0) {
    return "";
  }
  const className = escapeHtmlAttribute(options.className);
  const items = term.related
    .map(
      (related) =>
        `<li class="${className}__related-item"><a class="${className}__related-link" href="${escapeHtmlAttribute(
          related.path,
        )}" data-rr-taxonomy-related-count="${related.count}">${escapeHtml(related.title)}</a></li>`,
    )
    .join("");
  return `<nav class="${className}__related" aria-label="Related tags" data-rr-taxonomy-related><ul>${items}</ul></nav>`;
}

export function renderTaxonomyIndexPage(
  kind: TaxonomyKind,
  terms: readonly TaxonomyTerm[],
  options: ResolvedTaxonomyOptions,
): TaxonomyPage {
  const className = escapeHtmlAttribute(options.className);
  const label = kind === "tag" ? "Tags" : "Folders";
  const items = terms
    .map(
      (term) =>
        `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(
          term.path,
        )}" data-rr-taxonomy-count="${term.entries.length}">${escapeHtml(
          term.title,
        )}</a></li>`,
    )
    .join("");
  const html = `<section class="${className} ${className}--index" data-rr-taxonomy-index="${kind}"><h1 class="${className}__title">${escapeHtml(
    label,
  )}</h1><ul class="${className}__list">${items}</ul></section>`;

  return {
    title: label,
    frontmatter: { title: label },
    html,
    headTags: [],
  };
}

function renderFeedLinks(term: TaxonomyTerm, className: string): string {
  const links: string[] = [];
  if (term.feeds.rss) {
    links.push(
      `<a class="${className}__feed" type="application/rss+xml" href="${escapeHtmlAttribute(term.feeds.rss)}">RSS</a>`,
    );
  }
  if (term.feeds.atom) {
    links.push(
      `<a class="${className}__feed" type="application/atom+xml" href="${escapeHtmlAttribute(term.feeds.atom)}">Atom</a>`,
    );
  }
  if (term.feeds.json) {
    links.push(
      `<a class="${className}__feed" type="application/feed+json" href="${escapeHtmlAttribute(term.feeds.json)}">JSON</a>`,
    );
  }
  if (links.length === 0) return "";
  return `<nav class="${className}__feeds" aria-label="Feeds" data-rr-taxonomy-feeds>${links.join("")}</nav>`;
}
