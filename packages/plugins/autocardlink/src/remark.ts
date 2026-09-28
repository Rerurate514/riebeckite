import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { AutoCardLink, AutoCardLinkOptions } from "./types.js";

const CARD_CLASS = "rr-cardlink";
const CARDLINK_LANGUAGE = "cardlink";
const SAFE_LINK_SCHEMES = new Set(["http", "https"]);

const fieldPrefixes = {
  url: "url: ",
  title: "title: ",
  description: "description: ",
  host: "host: ",
  favicon: "favicon: ",
  image: "image: ",
} as const;

export function remarkAutoCardLink(options: AutoCardLinkOptions = {}) {
  const extraClassName = options.className?.trim() ?? "";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== CARDLINK_LANGUAGE) return;
      if (!parent || index === undefined) return;

      const cardLink = parseAutoCardLink(node);
      if (!cardLink.url || !hasSafeLinkScheme(cardLink.url)) return;

      parent.children.splice(
        index,
        1,
        renderAutoCardLink(cardLink, extraClassName),
      );
    });
  };
}

function parseAutoCardLink(node: Code): AutoCardLink {
  const lines = node.value.split("\n");

  return {
    url: findField(lines, fieldPrefixes.url),
    title: normalizeQuotedField(findField(lines, fieldPrefixes.title)),
    description: normalizeQuotedField(
      findField(lines, fieldPrefixes.description),
    ),
    host: findField(lines, fieldPrefixes.host),
    favicon: findField(lines, fieldPrefixes.favicon),
    image: findField(lines, fieldPrefixes.image),
  };
}

function findField(lines: readonly string[], prefix: string): string {
  const line = lines.find((currentLine) => currentLine.startsWith(prefix));
  if (!line) return "";

  return line.slice(prefix.length).trim();
}

function normalizeQuotedField(value: string): string {
  if (!isDoubleQuoted(value)) return value;

  return value.slice(1, -1).replace(/\\"/g, '"');
}

function isDoubleQuoted(value: string): boolean {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"');
}

function hasSafeLinkScheme(url: string): boolean {
  const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(url.trim())?.[0];
  if (!scheme) return true;

  return SAFE_LINK_SCHEMES.has(scheme.slice(0, -1).toLowerCase());
}

function renderAutoCardLink(
  cardLink: AutoCardLink,
  extraClassName: string,
): Html {
  const title = cardLink.title || cardLink.url;
  const label = cardLink.host || cardLink.url;
  const imageUrl = pickSafeUrl(cardLink.image);
  const faviconUrl = pickSafeUrl(cardLink.favicon);
  const rootClassName = buildRootClassName(imageUrl !== "", extraClassName);

  return {
    type: "html",
    value: `<a href="${escapeHtmlAttribute(cardLink.url)}" class="${escapeHtmlAttribute(rootClassName)}" target="_blank" rel="noopener noreferrer">
  <span class="${CARD_CLASS}__body">
    ${renderImage(imageUrl, cardLink)}
    <span class="${CARD_CLASS}__content">
      <span class="${CARD_CLASS}__title">${escapeHtml(title)}</span>
      ${renderDescription(cardLink.description)}
      <span class="${CARD_CLASS}__meta">
        ${renderFavicon(faviconUrl)}
        <span class="${CARD_CLASS}__host">${escapeHtml(label)}</span>
      </span>
    </span>
  </span>
</a>`,
  };
}

function buildRootClassName(hasImage: boolean, extraClassName: string): string {
  const classNames = [CARD_CLASS];
  if (!hasImage) classNames.push(`${CARD_CLASS}--no-image`);
  if (extraClassName) classNames.push(extraClassName);

  return classNames.join(" ");
}

function pickSafeUrl(value: string): string {
  if (!value || !hasSafeLinkScheme(value)) return "";

  return value;
}

function renderImage(imageUrl: string, cardLink: AutoCardLink): string {
  if (!imageUrl) return "";

  const alt = cardLink.host || cardLink.title || "link preview";
  return `<span class="${CARD_CLASS}__image-frame"><img class="${CARD_CLASS}__image" src="${escapeHtmlAttribute(imageUrl)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" decoding="async" data-lightbox-ignore="true"></span>`;
}

function renderDescription(description: string): string {
  if (!description) return "";

  return `<span class="${CARD_CLASS}__description">${escapeHtml(description)}</span>`;
}

function renderFavicon(faviconUrl: string): string {
  if (!faviconUrl) return "";

  return `<img class="${CARD_CLASS}__favicon" src="${escapeHtmlAttribute(faviconUrl)}" alt="" loading="lazy" decoding="async" data-lightbox-ignore="true">`;
}
