import { visit } from "unist-util-visit";
import type { Parent, Root, Text } from "mdast";
import slugify from "slugify";

export interface TagOptions {
  tagBase?: string;
  onTag?: (tag: string) => void;
}

const TAG_RE =
  /(^|[\s([{"'])#([\p{L}\p{N}_\-/]+)/gu;

export function remarkObsidianTag(opt: TagOptions = {}) {
  const { tagBase = "/tags/", onTag } = opt;

  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index == undefined) return;
      if (!node.value.includes("#")) return;

      const newNodes: any[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      TAG_RE.lastIndex = 0;

      while ((match = TAG_RE.exec(node.value)) !== null) {
        const [full, lead, rawTag] = match;
        const start = match.index;
        const tagStart = start + lead.length;

        const tag = normalizeTag(rawTag);
        if (!tag) {
          continue;
        }

        if (tagStart > lastIndex) {
          newNodes.push({
            type: "text",
            value: node.value.slice(lastIndex, tagStart),
          });
        }

        onTag?.(tag);

        newNodes.push({
          type: "link",
          url: buildTagUrl(tag, tagBase),
          data: {
            hProperties: {
              class: "tag",
              "data-tag": tag,
            },
          },
          children: [{ type: "text", value: `#${tag}` }],
        });

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

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/[/\-]+$/, "");
  if (!cleaned) return null;

  const isPurelyNumeric = /^[\p{N}/\-_]+$/u.test(cleaned);
  if (isPurelyNumeric) return null;

  return cleaned;
}

function buildTagUrl(tag: string, tagBase: string): string {
  const normalizedBase = tagBase.endsWith("/") ? tagBase : `${tagBase}/`;
  const encodedPath = tag
    .split("/")
    .map((segment) => encodeURIComponent(segment.toLowerCase()))
    .join("/");
  return `${normalizedBase}${slugifySegments(encodedPath)}`;
}

function slugifySegments(path: string): string {
  return path
    .split("/")
    .map((segment) => slugify(decodeURIComponent(segment), { lower: true, strict: true }))
    .join("/");
}
