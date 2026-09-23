import { attachmentUrl, isAttachmentPath, isImagePath } from "@riebeckite/core";
import { slug } from "github-slugger";
import type { Content, Html, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export interface WikilinkOptions {
  contentIndex: Map<string, string>;
  assetBase?: string;
  renderNoteEmbed?: (
    slug: string,
    fragment: WikilinkFragment | null,
  ) => Promise<string | null>;
  renderAttachment?: (input: {
    path: string;
    raw: string;
    label: string;
    url: string;
    embed: boolean;
  }) => Promise<string | null>;
}

export type WikilinkFragment =
  | { kind: "heading"; value: string }
  | { kind: "block"; value: string };

const WIKILINK_PATTERN =
  "(!)?\\[\\[([^\\]|#]+)(?:#(\\^[^\\]|]+|[^\\]|]+))?(?:\\|([^\\]]+))?\\]\\]";

export function remarkObsidianWikilink(opt: WikilinkOptions) {
  const {
    contentIndex,
    assetBase = "/",
    renderNoteEmbed,
    renderAttachment,
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

      if (start > lastIndex) {
        newNodes.push({
          type: "text",
          value: node.value.slice(lastIndex, start),
        });
      }

      const target = rawTarget?.trim();
      const isEmbed = embedMark === "!";
      const resolved = resolveTarget(target, contentIndex);
      const fragment = parseFragment(rawFragment);

      if (isEmbed && resolved?.kind === "image") {
        newNodes.push({
          type: "image",
          url: buildAssetsUrl(resolved.value, assetBase),
          alt: alias?.trim() ?? target,
        });
      } else if (isEmbed && resolved?.kind === "note") {
        const html = await renderNoteEmbed?.(resolved.value, fragment);

        if (html) {
          newNodes.push(createNoteEmbedNode(resolved.value, fragment, html));
        } else {
          newNodes.push({
            type: "link",
            url: `/${resolved.value}`,
            data: {
              hProperties: {
                class: "wikilink-embed-unresolved",
              },
            },
            children: [
              {
                type: "text",
                value: `[[埋め込み未解決：${target}]]`,
              },
            ],
          });
        }
      } else if (isEmbed && resolved?.kind === "attachment") {
        const label = alias?.trim() ?? target;
        const url = attachmentUrl(resolved.value);
        const html = await renderAttachment?.({
          path: resolved.value,
          raw: target,
          label,
          url,
          embed: true,
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(resolved.value, label, url),
        );
      } else if (isEmbed) {
        newNodes.push({
          type: "text",
          value: `[[埋め込み未解決：${target}]]`,
        });
      } else if (resolved?.kind === "note") {
        const label = alias?.trim() ?? target;
        const anchor = fragment ? `#${slugifyFragment(fragment)}` : "";
        newNodes.push({
          type: "link",
          url: `/${resolved.value}${anchor}`,
          data: { hProperties: { class: "wikilink" } },
          children: [{ type: "text", value: label }],
        });
      } else if (resolved?.kind === "image") {
        const label = alias?.trim() ?? target;
        newNodes.push({
          type: "link",
          url: buildAssetsUrl(resolved.value, assetBase),
          data: { hProperties: { class: "wikilink" } },
          children: [{ type: "text", value: label }],
        });
      } else if (resolved?.kind === "attachment") {
        const label = alias?.trim() ?? target;
        const url = attachmentUrl(resolved.value);
        const html = await renderAttachment?.({
          path: resolved.value,
          raw: target,
          label,
          url,
          embed: false,
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(resolved.value, label, url),
        );
      } else {
        const label = alias?.trim() ?? target;
        newNodes.push({
          type: "link",
          url: "#",
          data: { hProperties: { class: "wikilink wikilink-broken" } },
          children: [{ type: "text", value: label }],
        });
      }

      lastIndex = start + full.length;
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

function createNoteEmbedNode(
  slug: string,
  fragment: WikilinkFragment | null,
  html: string,
): Html {
  const fragmentAttribute = fragment
    ? ` data-wikilink-fragment="${escapeHtmlAttribute(fragment.value)}"`
    : "";
  return {
    type: "html",
    value: `<div class="wikilink-embed" data-wikilink-embed="${escapeHtmlAttribute(slug)}"${fragmentAttribute}>${html}</div>`,
  };
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Resolved = { kind: "note" | "image" | "attachment"; value: string };

function resolveTarget(
  target: string,
  contentIndex: Map<string, string>,
): Resolved | null {
  const key = target.toLowerCase();
  const value = contentIndex.get(key);
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
    value: `<a class="wikilink wikilink-attachment" href="${escapeHtmlAttribute(url)}" download>${escapeHtmlAttribute(label || path)}</a>`,
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
