import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { AutoCardLink, AutoCardLinkOptions } from "./types.js";

const DEFAULT_CLASS_NAME = "rr-cardlink";
const CARDLINK_LANGUAGE = "cardlink";

const fieldPrefixes = {
  url: "url: ",
  title: 'title: "',
  description: 'description: "',
  host: "host: ",
  favicon: "favicon: ",
  image: "image: ",
} as const;

export function remarkAutoCardLink(options: AutoCardLinkOptions = {}) {
  const className = options.className ?? DEFAULT_CLASS_NAME;

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== CARDLINK_LANGUAGE) return;
      if (!parent || index === undefined) return;

      const cardLink = parseAutoCardLink(node);
      if (!cardLink.url) return;

      parent.children.splice(index, 1, renderAutoCardLink(cardLink, className));
    });
  };
}

function parseAutoCardLink(node: Code): AutoCardLink {
  const lines = node.value.split("\n");

  return {
    url: findField(lines, fieldPrefixes.url),
    title: trimQuotedField(findField(lines, fieldPrefixes.title)),
    description: trimQuotedField(findField(lines, fieldPrefixes.description)),
    host: findField(lines, fieldPrefixes.host),
    favicon: findField(lines, fieldPrefixes.favicon),
    image: findField(lines, fieldPrefixes.image),
  };
}

function findField(lines: string[], prefix: string): string {
  const line = lines.find((currentLine) => currentLine.startsWith(prefix));
  if (!line) return "";

  return line.slice(prefix.length).trim();
}

function trimQuotedField(value: string): string {
  return value.replace(/^"|"$/g, "");
}

function renderAutoCardLink(cardLink: AutoCardLink, className: string): Html {
  const title = cardLink.title || cardLink.url;
  const label = cardLink.host || cardLink.url;
  const rootClassName = cardLink.image
    ? className
    : `${className} ${className}--no-image`;

  return {
    type: "html",
    value: `<a href="${escapeHtmlAttribute(cardLink.url)}" class="${escapeHtmlAttribute(rootClassName)}" target="_blank" rel="noopener noreferrer">
  <span class="${escapeHtmlAttribute(className)}__body">
    ${renderImage(cardLink, className)}
    <span class="${escapeHtmlAttribute(className)}__content">
      <span class="${escapeHtmlAttribute(className)}__title">${escapeHtml(title)}</span>
      ${renderDescription(cardLink.description, className)}
      <span class="${escapeHtmlAttribute(className)}__meta">
        ${renderFavicon(cardLink, className)}
        <span class="${escapeHtmlAttribute(className)}__host">${escapeHtml(label)}</span>
      </span>
    </span>
  </span>
</a>`,
  };
}

function renderImage(cardLink: AutoCardLink, className: string): string {
  if (!cardLink.image) return "";

  const alt = cardLink.host || cardLink.title || "link preview";
  return `<span class="${escapeHtmlAttribute(className)}__image-frame"><img class="${escapeHtmlAttribute(className)}__image" src="${escapeHtmlAttribute(cardLink.image)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" decoding="async" data-lightbox-ignore="true"></span>`;
}

function renderDescription(description: string, className: string): string {
  if (!description) return "";

  return `<span class="${escapeHtmlAttribute(className)}__description">${escapeHtml(description)}</span>`;
}

function renderFavicon(cardLink: AutoCardLink, className: string): string {
  if (!cardLink.favicon) return "";

  const alt = cardLink.host ? `${cardLink.host} favicon` : "favicon";
  return `<img class="${escapeHtmlAttribute(className)}__favicon" src="${escapeHtmlAttribute(cardLink.favicon)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" decoding="async" data-lightbox-ignore="true">`;
}
