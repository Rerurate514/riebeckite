import { escapeHtmlAttribute } from "@riebeckite/core";
import type { Content, Html, Paragraph, Parent, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { WikilinkFragment } from "./wikilink_shared.js";

export function createImageEmbedNode(
  url: string,
  alias: string | undefined,
  target: string,
): Html {
  const size = parseImageSize(alias);
  const alt = size ? target : (alias ?? target);
  const dimensions = size
    ? `${size.width ? ` width="${size.width}"` : ""}${size.height ? ` height="${size.height}"` : ""}`
    : "";
  return {
    type: "html",
    value: `<div class="rr-obsidian-wikilink-image-embed"><img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(alt)}"${dimensions} loading="lazy" decoding="async" /></div>`,
  };
}

export function parseImageSize(
  alias: string | undefined,
): { width?: number; height?: number } | null {
  const match = alias?.trim().match(/^(\d+)(?:x(\d+))?$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = match[2] ? Number(match[2]) : undefined;
  if (!Number.isSafeInteger(width) || width <= 0) return null;
  if (height !== undefined && (!Number.isSafeInteger(height) || height <= 0)) {
    return null;
  }
  return height === undefined ? { width } : { width, height };
}

export function splitParagraphEmbeds(tree: Root): void {
  const splits = new Map<Parent, { index: number; blocks: Content[] }[]>();

  visit(tree, "paragraph", (node, index, parent) => {
    if (!parent || index === undefined) return;
    const blocks = splitParagraphContent(node);
    if (!blocks) return;

    const entries = splits.get(parent) ?? [];
    entries.push({ index, blocks });
    splits.set(parent, entries);
  });

  for (const [owner, entries] of splits) {
    for (const { index, blocks } of [...entries].sort(
      (a, b) => b.index - a.index,
    )) {
      owner.children.splice(index, 1, ...blocks);
    }
  }
}

export function splitParagraphContent(paragraph: Paragraph): Content[] | null {
  if (!paragraph.children.some(isBlockEmbedHtml)) return null;

  const segments: Content[][] = [];
  let current: Content[] = [];

  for (const child of paragraph.children) {
    if (isBlockEmbedHtml(child)) {
      segments.push(current);
      current = [];
      segments.push([child]);
    } else {
      current.push(child);
    }
  }
  segments.push(current);

  const blocks: Content[] = [];
  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (segment.every(isBlankContent)) continue;
    if (segment.length === 1 && isBlockEmbedHtml(segment[0])) {
      blocks.push(segment[0]);
    } else {
      blocks.push({
        type: "paragraph",
        children: segment,
      } as Paragraph);
    }
  }

  return blocks.length > 0 ? blocks : null;
}

export function isBlankContent(child: Content): boolean {
  return child.type === "text" && child.value.trim() === "";
}

export function isBlockEmbedHtml(child: Content): child is Html {
  if (child.type !== "html") return false;
  const value = child.value;
  return (
    value.startsWith('<div class="rr-obsidian-wikilink-image-embed') ||
    value.startsWith('<div class="rr-obsidian-wikilink-embed') ||
    value.startsWith("<figure") ||
    value.startsWith("<aside")
  );
}

export function createNoteEmbedNode(
  slug: string,
  fragment: WikilinkFragment | null,
  html: string,
): Html {
  const fragmentAttribute = fragment
    ? ` data-wikilink-fragment="${escapeHtmlAttribute(fragment.kind === "block" ? `^${fragment.value}` : fragment.value)}"`
    : "";
  return {
    type: "html",
    value: `<div class="rr-obsidian-wikilink-embed" data-wikilink-embed="${escapeHtmlAttribute(slug)}"${fragmentAttribute}><span class="rr-obsidian-wikilink-embed__label">Embedded: ${escapeHtmlAttribute(slug)}</span>${html}</div>`,
  };
}

export function createUnresolvedEmbedNode(
  rawDestination: string,
  url: string,
): Content {
  return {
    type: "link",
    url,
    data: {
      hProperties: {
        class: "rr-obsidian-wikilink-embed-unresolved",
      },
    },
    children: [
      {
        type: "text",
        value: `[[Unresolved embed: ${rawDestination}]]`,
      },
    ],
  };
}

export function createAttachmentFallbackLink(
  path: string,
  label: string,
  url: string,
): Html {
  return {
    type: "html",
    value: `<a class="rr-obsidian-wikilink rr-obsidian-wikilink--attachment" href="${escapeHtmlAttribute(url)}" download>${escapeHtmlAttribute(label || path)}</a>`,
  };
}
