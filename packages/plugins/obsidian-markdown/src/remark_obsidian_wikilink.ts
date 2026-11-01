import {
  attachmentUrl,
  escapeHtmlAttribute,
  isAttachmentPath,
  isImagePath,
} from "@riebeckite/core";
import { slug } from "github-slugger";
import type { Content, Html, Paragraph, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export interface WikilinkOptions {
  contentIndex: Map<string, string>;
  resolvePermalink: (slug: string) => string;
  isRoutable?: (slug: string) => boolean;
  assetBase?: string;
  sourceSlug?: string;
  renderNoteEmbed?: (
    slug: string,
    fragment: WikilinkFragment | null,
  ) => Promise<string | null>;
  renderContent?: (input: {
    kind: string;
    path: string;
    raw: string;
    label: string;
    url: string;
    embed: boolean;
    fragment?: string;
  }) => Promise<string | null>;
}

export type WikilinkFragment =
  | { kind: "heading"; value: string }
  | { kind: "block"; value: string };

const WIKILINK_PATTERN =
  "(!)?\\[\\[([^\\]|#]*)(?:#([^\\]|]+))?(?:\\|([^\\]]+))?\\]\\]";
const WIKILINK_CLASS = "rr-obsidian-wikilink";
const BROKEN_WIKILINK_CLASS = `${WIKILINK_CLASS} rr-obsidian-wikilink--broken`;

export function remarkObsidianWikilink(opt: WikilinkOptions) {
  const {
    contentIndex,
    assetBase = "/",
    sourceSlug,
    renderNoteEmbed,
    renderContent,
    resolvePermalink,
    isRoutable,
  } = opt;

  return async (tree: Root) => {
    const replacements: {
      node: Text;
      index: number;
      parent: Parent;
    }[] = [];

    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes("[[")) return;

      replacements.push({ node, index, parent });
    });

    for (const replacement of replacements.reverse()) {
      await replaceWikilinks(
        replacement.node,
        replacement.index,
        replacement.parent,
      );
    }

    splitParagraphEmbeds(tree);
  };

  async function replaceWikilinks(node: Text, index: number, parent: Parent) {
    const newNodes: Content[] = [];
    let lastIndex = 0;

    const wikilinkRe = new RegExp(WIKILINK_PATTERN, "g");

    for (
      let match = wikilinkRe.exec(node.value);
      match !== null;
      match = wikilinkRe.exec(node.value)
    ) {
      const [full, embedMark, rawTarget, rawFragment, alias] = match;
      const start = match.index;
      const target = rawTarget?.trim() ?? "";
      const fragment = parseFragment(rawFragment);
      const aliasText = alias?.trim();
      const isEmbed = embedMark === "!";

      if (!target && !fragment) {
        continue;
      }

      const rawDestination = `${target}${rawFragment ? `#${rawFragment}` : ""}`;
      const resolved = resolveTarget(target, contentIndex, sourceSlug);
      const routable =
        resolved?.kind === "note" && isRoutable && !isRoutable(resolved.value)
          ? null
          : resolved;

      if (start > lastIndex) {
        newNodes.push({
          type: "text",
          value: node.value.slice(lastIndex, start),
        });
      }
      lastIndex = start + full.length;

      if (isEmbed && routable?.kind === "image") {
        newNodes.push(
          createImageEmbedNode(
            buildAssetsUrl(routable.value, assetBase),
            aliasText,
            target,
          ),
        );
      } else if (isEmbed && routable?.kind === "note") {
        const html = await renderNoteEmbed?.(routable.value, fragment);

        if (html) {
          newNodes.push(createNoteEmbedNode(routable.value, fragment, html));
        } else {
          newNodes.push(
            createUnresolvedEmbedNode(
              rawDestination,
              resolvePermalink(routable.value),
            ),
          );
        }
      } else if (isEmbed && routable?.kind === "attachment") {
        const label = aliasText ?? target;
        const url = attachmentUrl(routable.value);
        const html = await renderContent?.({
          kind: "attachment",
          path: routable.value,
          raw: target,
          label,
          url,
          embed: true,
          fragment: rawFragment?.trim(),
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(routable.value, label, url),
        );
      } else if (isEmbed) {
        newNodes.push({
          type: "text",
          value: `[[Unresolved embed: ${rawDestination}]]`,
        });
      } else if (routable?.kind === "note") {
        const fragmentLabel = fragment
          ? fragment.kind === "block"
            ? `^${fragment.value}`
            : fragment.value
          : "";
        const label =
          aliasText ??
          (target
            ? fragmentLabel
              ? `${target} > ${fragmentLabel}`
              : target
            : fragmentLabel);
        const anchor = fragment ? `#${slugifyFragment(fragment)}` : "";
        newNodes.push({
          type: "link",
          url: `${resolvePermalink(routable.value)}${anchor}`,
          data: { hProperties: { class: WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      } else if (routable?.kind === "image") {
        const label = aliasText ?? target;
        newNodes.push({
          type: "link",
          url: buildAssetsUrl(routable.value, assetBase),
          data: { hProperties: { class: WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      } else if (routable?.kind === "attachment") {
        const label = aliasText ?? target;
        const url = attachmentUrl(routable.value);
        const html = await renderContent?.({
          kind: "attachment",
          path: routable.value,
          raw: target,
          label,
          url,
          embed: false,
          fragment: rawFragment?.trim(),
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(routable.value, label, url),
        );
      } else {
        const label = aliasText ?? rawDestination;
        newNodes.push({
          type: "link",
          url: "#",
          data: { hProperties: { class: BROKEN_WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      }
    }

    if (lastIndex < node.value.length) {
      newNodes.push({
        type: "text",
        value: node.value.slice(lastIndex),
      });
    }

    if (newNodes.length > 0) {
      parent.children.splice(index, 1, ...newNodes);
    }
  }
}

function createImageEmbedNode(
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

function parseImageSize(
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

function splitParagraphEmbeds(tree: Root): void {
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

function splitParagraphContent(paragraph: Paragraph): Content[] | null {
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

function isBlankContent(child: Content): boolean {
  return child.type === "text" && child.value.trim() === "";
}

function isBlockEmbedHtml(child: Content): child is Html {
  if (child.type !== "html") return false;
  const value = child.value;
  return (
    value.startsWith('<div class="rr-obsidian-wikilink-image-embed') ||
    value.startsWith('<div class="rr-obsidian-wikilink-embed') ||
    value.startsWith("<figure") ||
    value.startsWith("<aside")
  );
}

function createNoteEmbedNode(
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

function createUnresolvedEmbedNode(
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

type Resolved = {
  kind: "note" | "image" | "attachment";
  value: string;
};

function resolveTarget(
  target: string,
  contentIndex: Map<string, string>,
  sourceSlug: string | undefined,
): Resolved | null {
  if (!target) {
    return sourceSlug ? { kind: "note", value: sourceSlug } : null;
  }

  const value = contentIndex.get(target.toLowerCase());
  if (!value) return null;

  const kind = isImagePath(value)
    ? "image"
    : isAttachmentPath(value)
      ? "attachment"
      : "note";

  return { kind, value };
}

function createAttachmentFallbackLink(
  path: string,
  label: string,
  url: string,
): Html {
  return {
    type: "html",
    value: `<a class="rr-obsidian-wikilink rr-obsidian-wikilink--attachment" href="${escapeHtmlAttribute(url)}" download>${escapeHtmlAttribute(label || path)}</a>`,
  };
}

function buildAssetsUrl(assetPath: string, assetBase: string): string {
  const normalizedBase = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  const encodePath = assetPath.split("/").map(encodeURIComponent).join("/");
  return `${normalizedBase}${encodePath}`;
}

function slugifyHeading(heading: string): string {
  return slug(heading.trim());
}

function parseFragment(
  rawFragment: string | undefined,
): WikilinkFragment | null {
  const value = rawFragment?.trim();
  if (!value) return null;
  if (value.startsWith("^")) {
    const blockId = value.slice(1).trim();
    return blockId ? { kind: "block", value: blockId } : null;
  }
  return { kind: "heading", value };
}

function slugifyFragment(fragment: WikilinkFragment): string {
  if (fragment.kind === "block") return fragment.value;
  return slugifyHeading(fragment.value);
}
