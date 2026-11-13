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
  sourcePath?: string,
): ContentLink[] {
  const links: ContentLink[] = [];
  const occurrences = extractLinkOccurrences(
    markdown,
    sourcePath ? { sourcePath } : {},
  );
  const definitions = new Map(
    occurrences
      .filter(
        (occurrence) =>
          occurrence.syntax === "reference-definition" &&
          occurrence.referenceLabel !== undefined,
      )
      .map((occurrence) => [
        occurrence.referenceLabel as string,
        occurrence.normalizedDestination,
      ]),
  );
  for (const occurrence of resolveLinkOccurrences(occurrences, {
    contentIndex,
    contentIndexAmbiguities,
  })) {
    const markdownLink =
      occurrence.syntax === "markdown-link" ||
      occurrence.syntax === "reference-link";
    if (markdownLink) {
      const destination =
        occurrence.syntax === "reference-link"
          ? definitions.get(occurrence.referenceLabel ?? "")
          : occurrence.normalizedDestination;
      const targetPath = destination?.split(/[#?]/, 1)[0] ?? "";
      if (
        occurrence.resolution !== "resolved" ||
        !targetPath.toLowerCase().endsWith(".md")
      ) {
        continue;
      }
    } else if (
      occurrence.syntax !== "wikilink" &&
      occurrence.syntax !== "wiki-embed"
    ) {
      continue;
    }
    const rawTarget = occurrence.normalizedDestination;
    const resolved = occurrence.target?.slug ?? null;
    links.push({
      raw: rawTarget,
      slug: resolved,
      kind: markdownLink
        ? "note"
        : resolved
          ? linkKind(resolved)
          : "unresolved",
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
