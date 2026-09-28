import type { ContentManifest } from "@riebeckite/core";
import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { KanbanColumn, KanbanParseResult } from "./parse.js";
import type { ResolvedKanbanOptions } from "./types.js";

export type KanbanLink = {
  href: string;
  label: string;
};

export type KanbanLinkResolver = (target: string) => KanbanLink | null;

export type KanbanSource = "block" | "note";

const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const TAG = /(^|[\s(])#([A-Za-z0-9_\-/]+)/g;
const BOLD = /\*\*([^*]+)\*\*/g;

export function createKanbanLinkResolver(
  manifest: ContentManifest,
): KanbanLinkResolver {
  return (target) => {
    const label = target.trim();
    if (!label) return null;
    const slug = manifest.contentIndex.get(label.toLowerCase());
    if (!slug) return null;
    const entry = manifest.bySlug.get(slug);
    if (!entry) return null;
    return { href: entry.permalink, label };
  };
}

export function renderKanban(
  result: KanbanParseResult,
  options: ResolvedKanbanOptions,
  resolveLink: KanbanLinkResolver,
  source: KanbanSource,
): string {
  const className = escapeHtmlAttribute(options.className);
  const parts = [
    `<div class="${className}" data-kanban data-kanban-plugin data-kanban-source="${source}">`,
    `<div class="${className}__board" data-kanban-board>`,
  ];

  for (const column of result.columns) {
    parts.push(renderColumn(column, options, resolveLink));
  }

  parts.push("</div>");
  if (options.fallback && result.fallback.length > 0) {
    parts.push(renderFallback(result.fallback, options));
  }
  parts.push("</div>");
  return parts.join("");
}

function renderColumn(
  column: KanbanColumn,
  options: ResolvedKanbanOptions,
  resolveLink: KanbanLinkResolver,
): string {
  const className = escapeHtmlAttribute(options.className);
  const cards = column.cards
    .map((card) => renderCard(card, options, resolveLink))
    .join("");
  return [
    `<div class="${className}__column" data-column="${escapeHtmlAttribute(column.name)}">`,
    `<header class="${className}__column-title">${escapeHtml(column.name)}</header>`,
    `<ul class="${className}__cards">${cards}</ul>`,
    "</div>",
  ].join("");
}

function renderCard(
  card: KanbanColumn["cards"][number],
  options: ResolvedKanbanOptions,
  resolveLink: KanbanLinkResolver,
): string {
  const className = escapeHtmlAttribute(options.className);
  const checked = card.checked ? "true" : "false";
  return [
    `<li class="${className}__card" data-checked="${checked}">`,
    `<span class="${className}__checkbox" data-checked="${checked}" aria-hidden="true"></span>`,
    `<span class="${className}__card-text">${renderCardText(card.text, options, resolveLink)}</span>`,
    "</li>",
  ].join("");
}

function renderCardText(
  text: string,
  options: ResolvedKanbanOptions,
  resolveLink: KanbanLinkResolver,
): string {
  const className = escapeHtmlAttribute(options.className);
  let html = escapeHtml(text);

  html = html.replace(
    BOLD,
    (_match, content: string) =>
      `<strong class="${className}__strong">${content}</strong>`,
  );

  html = html.replace(
    TAG,
    (_match, prefix: string, tag: string) =>
      `${prefix}<span class="${className}__tag">#${tag}</span>`,
  );

  html = html.replace(WIKILINK, (_match, target: string, fragment, alias) => {
    const label = (alias ?? target).trim();
    const link = resolveLink(target);
    if (!link) {
      return `<span class="${className}__wikilink ${className}__wikilink--broken">${escapeHtml(label)}</span>`;
    }
    const anchor = fragment ? `#${fragment}` : "";
    return `<a class="${className}__wikilink" href="${escapeHtmlAttribute(`${link.href}${anchor}`)}" data-kanban-link="${escapeHtmlAttribute(target.trim())}">${escapeHtml(label)}</a>`;
  });

  return html;
}

function renderFallback(
  lines: readonly string[],
  options: ResolvedKanbanOptions,
): string {
  const className = escapeHtmlAttribute(options.className);
  return [
    `<details class="${className}__fallback">`,
    `<summary class="${className}__fallback-title">Unsupported content</summary>`,
    `<pre class="${className}__fallback-body">${escapeHtml(lines.join("\n"))}</pre>`,
    "</details>",
  ].join("");
}
