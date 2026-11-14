import { isAttachmentPath, isImagePath } from "@riebeckite/core";
import { slug } from "github-slugger";

export type WikilinkFragment =
  | { kind: "heading"; value: string }
  | { kind: "block"; value: string };

export const WIKILINK_PATTERN =
  "(!)?\\[\\[([^\\]|#]*)(?:#([^\\]|]+))?(?:\\|([^\\]]+))?\\]\\]";

export const WIKILINK_CLASS = "rr-obsidian-wikilink";

export const BROKEN_WIKILINK_CLASS = `${WIKILINK_CLASS} rr-obsidian-wikilink--broken`;

export type Resolved = {
  kind: "note" | "image" | "attachment";
  value: string;
};

export function buildAssetsUrl(assetPath: string, assetBase: string): string {
  const normalizedBase = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  const encodePath = assetPath.split("/").map(encodeURIComponent).join("/");
  return `${normalizedBase}${encodePath}`;
}

export function slugifyHeading(heading: string): string {
  return slug(heading.trim());
}

export function slugifyFragment(fragment: WikilinkFragment): string {
  if (fragment.kind === "block") return fragment.value;
  return slugifyHeading(fragment.value);
}

export function parseFragment(
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

export function resolveTarget(
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
