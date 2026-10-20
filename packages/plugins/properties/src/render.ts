import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { buildPropertiesData } from "./model.js";
import {
  DEFAULT_PROPERTIES_CLASS,
  resolvePropertiesOptions,
} from "./options.js";
import type {
  PropertiesData,
  PropertiesOptions,
  PropertiesRenderContext,
  PropertyInlinePart,
  PropertyValue,
} from "./types.js";

export function renderPropertiesData(data: PropertiesData): string {
  if (data.items.length === 0) return "";

  const className = data.className.trim() || DEFAULT_PROPERTIES_CLASS;
  const cls = className.split(/\s+/, 1)[0] || DEFAULT_PROPERTIES_CLASS;
  const rows = data.items
    .map((item) => renderRow(item.key, item.value, cls))
    .join("");
  const list = `<dl class="${escapeHtmlAttribute(cls)}__rows">${rows}</dl>`;
  const title = data.title ?? "";
  const attributes = `data-properties data-property-count="${data.items.length}"`;

  const rootClass = escapeHtmlAttribute(className);
  if (data.collapsed) {
    const summary = title ? escapeHtml(title) : "";
    const label = title ? "" : ' aria-label="Properties"';
    return (
      `<details class="${rootClass}" ${attributes} data-collapsed>` +
      `<summary class="${escapeHtmlAttribute(cls)}__summary"${label}>${summary}</summary>` +
      `${list}</details>`
    );
  }

  const heading = title
    ? `<h2 class="${escapeHtmlAttribute(cls)}__title">${escapeHtml(title)}</h2>`
    : "";
  return `<section class="${rootClass}" ${attributes}>${heading}${list}</section>`;
}

/**
 * Renders an Obsidian-style note property panel from a frontmatter object.
 *
 * The function is pure: it only reads its arguments and returns HTML. It is
 * exported separately from the plugin so it can be exercised in isolation.
 * Returns an empty string when there is nothing to render.
 */
export function renderPropertiesPanel(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: PropertiesOptions = {},
  context: PropertiesRenderContext = {},
): string {
  const resolved = resolvePropertiesOptions(options);
  return renderPropertiesData(
    buildPropertiesData(frontmatter, resolved, context),
  );
}

function renderRow(key: string, value: PropertyValue, cls: string): string {
  return (
    `<div class="${escapeHtmlAttribute(cls)}__row" data-property-key="${escapeHtmlAttribute(key)}">` +
    `<dt class="${escapeHtmlAttribute(cls)}__key">${escapeHtml(key)}</dt>` +
    `<dd class="${escapeHtmlAttribute(cls)}__value">${renderValue(value, cls)}</dd>` +
    "</div>"
  );
}

function renderValue(value: PropertyValue, cls: string): string {
  switch (value.kind) {
    case "text":
      return escapeHtml(value.text);
    case "link":
      return renderLink(value.text, value.href, value.external, cls);
    case "tags":
      return renderTags(value.tags, value.variant, cls);
    case "badge":
      return renderBadge(value.text, value.variant, cls);
    case "date":
      return (
        `<time class="${escapeHtmlAttribute(cls)}__date" ` +
        `datetime="${escapeHtmlAttribute(value.value)}">` +
        `${escapeHtml(value.formatted)}</time>`
      );
    case "inline":
      return value.parts.map((part) => renderInlinePart(part, cls)).join("");
    case "list":
      return (
        `<ul class="${escapeHtmlAttribute(cls)}__list">` +
        value.items
          .map(
            (item) =>
              `<li class="${escapeHtmlAttribute(cls)}__list-item">` +
              `${renderValue(item, cls)}</li>`,
          )
          .join("") +
        "</ul>"
      );
    case "group":
      return (
        `<dl class="${escapeHtmlAttribute(cls)}__nested">` +
        value.entries
          .map((entry) => renderRow(entry.key, entry.value, cls))
          .join("") +
        "</dl>"
      );
    case "boolean":
      return (
        `<span class="${escapeHtmlAttribute(cls)}__boolean" ` +
        `data-boolean="${value.value}">${value.value}</span>`
      );
    case "number":
      return (
        `<span class="${escapeHtmlAttribute(cls)}__number" ` +
        `data-number="${escapeHtmlAttribute(value.value)}">` +
        `${escapeHtml(value.value)}</span>`
      );
  }
}

function renderTags(
  tags: readonly {
    readonly tag: string;
    readonly text: string;
    readonly href?: string;
  }[],
  variant: string,
  cls: string,
): string {
  return (
    `<ul class="${escapeHtmlAttribute(cls)}__list" ` +
    `data-variant="${escapeHtmlAttribute(variant)}">` +
    tags
      .map((tag) => {
        const content = tag.href
          ? `<a class="${escapeHtmlAttribute(cls)}__tag" ` +
            `data-tag="${escapeHtmlAttribute(tag.tag)}" ` +
            `href="${escapeHtmlAttribute(tag.href)}">${escapeHtml(tag.text)}</a>`
          : `<span class="${escapeHtmlAttribute(cls)}__tag" ` +
            `data-tag="${escapeHtmlAttribute(tag.tag)}">${escapeHtml(tag.text)}</span>`;
        return `<li class="${escapeHtmlAttribute(cls)}__list-item">${content}</li>`;
      })
      .join("") +
    "</ul>"
  );
}

function renderBadge(
  text: string,
  variant: string | undefined,
  cls: string,
): string {
  const attribute = variant
    ? ` data-variant="${escapeHtmlAttribute(variant)}"`
    : "";
  return (
    `<span class="${escapeHtmlAttribute(cls)}__badge"${attribute}>` +
    `${escapeHtml(text)}</span>`
  );
}

function renderInlinePart(part: PropertyInlinePart, cls: string): string {
  return part.kind === "link"
    ? renderLink(part.text, part.href, part.external, cls)
    : escapeHtml(part.text);
}

function renderLink(
  text: string,
  href: string,
  external: boolean,
  cls: string,
): string {
  const classes = external
    ? `${cls}__link ${cls}__link--external`
    : `${cls}__link`;
  const externalAttributes = external
    ? ' rel="noopener noreferrer" target="_blank"'
    : "";
  return (
    `<a class="${escapeHtmlAttribute(classes)}" ` +
    `href="${escapeHtmlAttribute(href)}"${externalAttributes}>` +
    `${escapeHtml(text)}</a>`
  );
}
