import { attachmentUrl, isAttachmentPath, isImagePath } from "@riebeckite/core";
import type { CanvasResolver } from "./types.js";

export function createCanvasResolver(
  contentIndex: Map<string, string>,
): CanvasResolver {
  return {
    resolveFile(file) {
      const target = file.trim();
      const resolved = lookup(contentIndex, target);
      if (!resolved) return { kind: "unresolved", label: getFileName(target) };

      if (isImagePath(resolved) || isAttachmentPath(resolved)) {
        return {
          kind: "asset",
          url: attachmentUrl(resolved),
          label: getFileName(target),
        };
      }
      return {
        kind: "note",
        slug: stripMarkdown(resolved),
        label: getFileName(target),
      };
    },
    resolveWikilink(target) {
      const value = target.trim();
      const resolved = lookup(contentIndex, value);
      if (!resolved) return null;
      if (isImagePath(resolved) || isAttachmentPath(resolved)) return null;
      return { slug: stripMarkdown(resolved), label: value };
    },
  };
}

export function lookupContentIndex(
  contentIndex: Map<string, string>,
  target: string,
): string | null {
  const lower = target.toLowerCase();
  return (
    contentIndex.get(lower) ??
    contentIndex.get(lower.replace(/\.md$/, "")) ??
    null
  );
}

function lookup(
  contentIndex: Map<string, string>,
  target: string,
): string | null {
  return lookupContentIndex(contentIndex, target);
}

function stripMarkdown(path: string): string {
  return path.replace(/\.md$/, "");
}

function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}
