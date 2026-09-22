import type { Content, Html, Parent, Root, Text } from "mdast";
import slugify from "slugify";
import { visit } from "unist-util-visit";

export interface WikilinkOptions {
  contentIndex: Map<string, string>;
  assetBase?: string;
  renderNoteEmbed?: (slug: string) => Promise<string | null>;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];
const WIKILINK_RE = /(!)?\[\[([^\]|#^]+)(?:[#^]([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function remarkObsidianWikilink(opt: WikilinkOptions) {
  const { contentIndex, assetBase = "/", renderNoteEmbed } = opt;

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

    WIKILINK_RE.lastIndex = 0;

    for (
      let match = WIKILINK_RE.exec(node.value);
      match !== null;
      match = WIKILINK_RE.exec(node.value)
    ) {
      const [full, embedMark, rawTarget, heading, alias] = match;
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

      if (isEmbed && resolved?.kind === "image") {
        newNodes.push({
          type: "image",
          url: buildAssetsUrl(resolved.value, assetBase),
          alt: alias?.trim() ?? target,
        });
      } else if (isEmbed && resolved?.kind === "note") {
        const html = await renderNoteEmbed?.(resolved.value);

        if (html) {
          newNodes.push(createNoteEmbedNode(resolved.value, html));
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
      } else if (isEmbed) {
        newNodes.push({
          type: "text",
          value: `[[埋め込み未解決：${target}]]`,
        });
      } else if (resolved?.kind === "note") {
        const label = alias?.trim() ?? target;
        const anchor = heading ? `#${slugifyHeading(heading)}` : "";
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

function createNoteEmbedNode(slug: string, html: string): Html {
  return {
    type: "html",
    value: `<div class="wikilink-embed" data-wikilink-embed="${escapeHtmlAttribute(slug)}">${html}</div>`,
  };
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Resolved = { kind: "note" | "image"; value: string };

function resolveTarget(
  target: string,
  contentIndex: Map<string, string>,
): Resolved | null {
  const key = target.toLowerCase();
  const value = contentIndex.get(key);
  if (!value) return null;

  const ext = value.split(".").pop()?.toLowerCase() ?? "";
  const kind: "note" | "image" = IMAGE_EXTENSIONS.includes(ext)
    ? "image"
    : "note";

  return { kind, value };
}

function buildAssetsUrl(assetPath: string, assetBase: string): string {
  const normalizedBase = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  const encodePath = assetPath.split("/").map(encodeURIComponent).join("/");
  return `${normalizedBase}${encodePath}`;
}

function slugifyHeading(heading: string): string {
  return slugify(heading, {
    lower: true,
    strict: true,
  });
}
