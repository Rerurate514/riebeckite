import remarkParse from "remark-parse";
import { unified } from "unified";
import type { ContentLink } from "../types/content_manifest.js";
import { isAttachmentPath, isImagePath } from "./attachment.js";
import { extractLinkOccurrences } from "./link_occurrences.js";
import { resolveLinkOccurrences } from "./link_resolution.js";

export function extractContentLinks(
  markdown: string,
  contentIndex: Map<string, string>,
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>,
): ContentLink[] {
  const links: ContentLink[] = [];
  for (const occurrence of resolveLinkOccurrences(
    extractLinkOccurrences(markdown),
    { contentIndex, contentIndexAmbiguities },
  )) {
    if (occurrence.syntax !== "wikilink" && occurrence.syntax !== "wiki-embed")
      continue;
    const rawTarget = occurrence.normalizedDestination;
    const resolved = occurrence.target?.slug ?? null;
    links.push({
      raw: rawTarget,
      slug: resolved,
      kind: resolved ? linkKind(resolved) : "unresolved",
      embed: occurrence.embed,
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
