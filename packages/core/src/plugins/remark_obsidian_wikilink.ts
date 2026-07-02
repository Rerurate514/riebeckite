import { visit } from "unist-util-visit";
import type { Parent, Root, Text } from "mdast";
import slugify from "slugify";

export interface WikilinkOptions {
  contentIndex: Map<string, string>;
  assetBase?: string;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];
const WIKILINK_RE = /(!)?\[\[([^\]|#^]+)(?:[#^]([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function remarkObsidianWikilink(opt: WikilinkOptions) {
  const { contentIndex, assetBase = "/" } = opt;

  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index == undefined) return;
      if (!node.value.includes("[[")) return;

      const newNodes: any[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      WIKILINK_RE.lastIndex = 0;

      while ((match = WIKILINK_RE.exec(node.value)) !== null) {
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
                value: `[[埋め込み未対応: ${target}]]`,
              },
            ],
          });
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
        return index + newNodes.length;
      }
    });
  };
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
