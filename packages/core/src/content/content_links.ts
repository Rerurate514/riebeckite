import type { ContentLink } from "../types/content_manifest";
import { isAttachmentPath, isImagePath } from "./attachment";

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

function linkKind(value: string): "note" | "image" | "attachment" {
  if (isImagePath(value)) return "image";
  if (isAttachmentPath(value)) return "attachment";
  return "note";
}
