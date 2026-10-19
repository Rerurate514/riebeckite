import remarkParse from "remark-parse";
import { unified } from "unified";
import type { ContentLink } from "../types/content_manifest.js";
import { isAttachmentPath, isImagePath } from "./attachment.js";

const WIKILINK_PATTERN =
  /(!)?\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;

export function extractContentLinks(
  markdown: string,
  contentIndex: Map<string, string>,
): ContentLink[] {
  WIKILINK_PATTERN.lastIndex = 0;
  const links: ContentLink[] = [];

  for (
    let match = WIKILINK_PATTERN.exec(markdown);
    match !== null;
    match = WIKILINK_PATTERN.exec(markdown)
  ) {
    const rawTarget = match[2]?.trim();
    if (!rawTarget) continue;

    const resolved = contentIndex.get(rawTarget.toLowerCase()) ?? null;
    links.push({
      raw: rawTarget,
      slug: resolved,
      kind: resolved ? linkKind(resolved) : "unresolved",
      embed: match[1] === "!",
    });
  }

  return links;
}

export function extractMarkdownLinkUrls(markdown: string): string[] {
  const urls: string[] = [];
  visitMarkdownNodes(
    unified().use(remarkParse).parse(markdown) as MarkdownNode,
    (node) => {
      if (node.type === "link" && typeof node.url === "string") {
        urls.push(node.url);
      }
    },
  );
  return urls;
}

type MarkdownNode = {
  readonly type?: string;
  readonly url?: unknown;
  readonly children?: readonly MarkdownNode[];
};

function visitMarkdownNodes(
  node: MarkdownNode,
  visit: (node: MarkdownNode) => void,
): void {
  visit(node);
  for (const child of node.children ?? []) visitMarkdownNodes(child, visit);
}

function linkKind(value: string): "note" | "image" | "attachment" {
  if (isImagePath(value)) return "image";
  if (isAttachmentPath(value)) return "attachment";
  return "note";
}
