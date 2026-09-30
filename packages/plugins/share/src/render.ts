import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { buildShareLinks, type ShareTarget } from "./services.js";
import type {
  ResolvedShareOptions,
  SharePlacement,
  ShareService,
} from "./types.js";

/** Attribute that marks the generated controls for tests, CSS, and JS. */
export const SHARE_ATTRIBUTE = "data-rr-share";

/** Stable root hook every rendered set carries, even with a custom class. */
export const SHARE_ROOT_CLASS = "rr-share";

/**
 * Renders the share controls for one note. Returns an empty string when no
 * service can be rendered, so callers can leave the HTML untouched.
 */
export function renderShareControls(
  options: ResolvedShareOptions,
  target: ShareTarget,
): string {
  const links = buildShareLinks(options, target);
  const wantsCopy = options.services.includes("copy");
  if (links.length === 0 && !wantsCopy) return "";

  const rootClass = options.className
    ? `${SHARE_ROOT_CLASS} ${options.className}`
    : SHARE_ROOT_CLASS;
  const items = links.map(renderLinkItem).join("");
  const copyItem = wantsCopy ? renderCopyItem(options, target) : "";

  const ariaLabel = escapeHtmlAttribute(options.ariaLabel);
  return (
    `<div class="${escapeHtmlAttribute(rootClass)}" ${SHARE_ATTRIBUTE} ` +
    `data-rr-share-placement="${escapeHtmlAttribute(options.placement)}" ` +
    `role="group" aria-label="${ariaLabel}">` +
    `<ul class="${SHARE_ROOT_CLASS}__list">${items}${copyItem}</ul>` +
    `<p class="${SHARE_ROOT_CLASS}__status" role="status" aria-live="polite"></p>` +
    `</div>`
  );
}

/**
 * Inserts the rendered controls into a note fragment. Top placement lands
 * after the opening `<article>` (or at the start) and bottom placement lands
 * before the closing `</article>` (or at the end).
 */
export function injectShareControls(
  html: string,
  block: string,
  placement: SharePlacement,
): string {
  if (block === "" || html.includes(SHARE_ATTRIBUTE)) return html;

  if (placement === "top") {
    const article = /<article\b[^>]*>/i.exec(html);
    if (article) {
      const end = article.index + article[0].length;
      return `${html.slice(0, end)}${block}${html.slice(end)}`;
    }
    const body = /<body\b[^>]*>/i.exec(html);
    if (body) {
      const end = body.index + body[0].length;
      return `${html.slice(0, end)}${block}${html.slice(end)}`;
    }
    return `${block}\n${html}`;
  }

  const closeIndex = html.toLowerCase().lastIndexOf("</article>");
  if (closeIndex !== -1) {
    return `${html.slice(0, closeIndex)}${block}${html.slice(closeIndex)}`;
  }
  return `${html}\n${block}`;
}

function renderLinkItem(link: {
  service: ShareService;
  label: string;
  url: string;
}): string {
  const modifier = `${SHARE_ROOT_CLASS}__link--${link.service}`;
  return (
    `<li class="${SHARE_ROOT_CLASS}__item">` +
    `<a class="${SHARE_ROOT_CLASS}__link ${modifier}" ` +
    `href="${escapeHtmlAttribute(link.url)}" ` +
    `target="_blank" rel="noopener noreferrer" ` +
    `data-share-service="${escapeHtmlAttribute(link.service)}">` +
    `${escapeHtml(link.label)}</a>` +
    `</li>`
  );
}

function renderCopyItem(
  options: ResolvedShareOptions,
  target: ShareTarget,
): string {
  return (
    `<li class="${SHARE_ROOT_CLASS}__item">` +
    `<button type="button" ` +
    `class="${SHARE_ROOT_CLASS}__button ${SHARE_ROOT_CLASS}__copy" ` +
    `data-rr-share-copy ` +
    `data-share-url="${escapeHtmlAttribute(target.url)}" ` +
    `data-rr-share-copied="${escapeHtmlAttribute(options.copiedLabel)}" ` +
    `data-rr-share-copy-failed="${escapeHtmlAttribute(options.copyFailedLabel)}" ` +
    `hidden>${escapeHtml(options.labels.copy)}</button>` +
    `</li>`
  );
}
