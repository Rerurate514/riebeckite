import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { AutoCardLink, AutoCardLinkOptions } from "./types";

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
    value: `<a href="${escapeAttribute(cardLink.url)}" class="${escapeAttribute(rootClassName)}" target="_blank" rel="noopener noreferrer">
  <span class="${escapeAttribute(className)}__body">
    ${renderImage(cardLink, className)}
    <span class="${escapeAttribute(className)}__content">
      <span class="${escapeAttribute(className)}__title">${escapeHtml(title)}</span>
      ${renderDescription(cardLink.description, className)}
      <span class="${escapeAttribute(className)}__meta">
        ${renderFavicon(cardLink, className)}
        <span class="${escapeAttribute(className)}__host">${escapeHtml(label)}</span>
      </span>
    </span>
  </span>
</a>`,
  };
}

function renderImage(cardLink: AutoCardLink, className: string): string {
  if (!cardLink.image) return "";

  const alt = cardLink.host || cardLink.title || "link preview";
  return `<span class="${escapeAttribute(className)}__image-frame"><img class="${escapeAttribute(className)}__image" src="${escapeAttribute(cardLink.image)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" data-lightbox-ignore="true"></span>`;
}

function renderDescription(description: string, className: string): string {
  if (!description) return "";

  return `<span class="${escapeAttribute(className)}__description">${escapeHtml(description)}</span>`;
}

function renderFavicon(cardLink: AutoCardLink, className: string): string {
  if (!cardLink.favicon) return "";

  const alt = cardLink.host ? `${cardLink.host} favicon` : "favicon";
  return `<img class="${escapeAttribute(className)}__favicon" src="${escapeAttribute(cardLink.favicon)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" data-lightbox-ignore="true">`;
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
