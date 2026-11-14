import type { ParsedFrontmatter } from "./frontmatter.js";
import type { ResolvedTarget, ScannedNote, TargetKind } from "./vault_part1.js";

export function resolveVaultRelative(value: string): string | null {
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  if (value.startsWith("/")) return null;

  const withoutAnchor = value.split(/[?#]/)[0];
  if (!withoutAnchor) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutAnchor);
  } catch {
    return null;
  }

  return normalizeRelativePath(decoded.split("/"));
}

export function addToIndex(
  targetIndex: Map<string, ResolvedTarget>,
  value: string,
  kind: TargetKind,
  fm?: ParsedFrontmatter,
) {
  // Notes take precedence over assets sharing the same key; within one kind the
  // first registration wins. This keeps the pre-existing ambiguity resolution
  // while ensuring a note target is never mistaken for an asset.
  const setKey = (key: string) => {
    const existing = targetIndex.get(key);
    if (existing && !(existing.kind !== "note" && kind === "note")) return;
    targetIndex.set(key, { kind, value });
  };

  const parts = value.split("/");
  for (let i = parts.length - 1; i >= 0; i--) {
    setKey(parts.slice(i).join("/").toLowerCase());
  }

  if (fm) {
    const aliases = fm.values.aliases;
    const aliasList = Array.isArray(aliases)
      ? aliases.filter((alias): alias is string => typeof alias === "string")
      : [];
    for (const alias of aliasList) {
      const key = alias.trim().toLowerCase();
      if (key) setKey(key);
    }
    return;
  }

  const stemValue = value.replace(/\.[^/.]+$/, "");
  if (stemValue !== value) {
    const stemParts = stemValue.split("/");
    for (let i = stemParts.length - 1; i >= 0; i--) {
      setKey(stemParts.slice(i).join("/").toLowerCase());
    }
  }
}

export function extractHeadings(markdown: string): Set<string> {
  const headings = new Set<string>();
  for (const line of markdown.split("\n")) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    const heading = match?.[1]?.trim();
    if (heading) headings.add(heading.toLowerCase());
  }
  return headings;
}

export function extractBlockIds(markdown: string): Set<string> {
  const blockIds = new Set<string>();
  for (const line of markdown.split("\n")) {
    const match = line.match(/(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/);
    const blockId = match?.[1];
    if (blockId) blockIds.add(blockId);
  }
  return blockIds;
}

export function fragmentExists(note: ScannedNote, fragment: string): boolean {
  const raw = fragment.trim();
  if (raw.startsWith("^")) {
    const blockId = raw.slice(1).trim();
    return blockId !== "" && note.blockIds.has(blockId);
  }
  const heading = raw.toLowerCase();
  return heading !== "" && note.headings.has(heading);
}

export function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n");
}

export function resolveNoteLanguage(
  relativePath: string,
  frontmatterLang: unknown,
  languages: readonly string[] | undefined,
): string | undefined {
  if (!languages || languages.length === 0) return undefined;
  if (typeof frontmatterLang === "string" && frontmatterLang.trim()) {
    const value = frontmatterLang.trim().toLowerCase();
    const match = languages.find(
      (language) => language.toLowerCase() === value,
    );
    if (match) return match;
  }
  const filename = relativePath.split("/").at(-1)?.replace(/\.md$/i, "") ?? "";
  const lower = filename.toLowerCase();
  for (const language of languages) {
    const tag = language.toLowerCase();
    if (
      lower.endsWith(`.${tag}`) ||
      lower.endsWith(`-${tag}`) ||
      lower.endsWith(`_${tag}`)
    )
      return language;
  }
  return undefined;
}

export function getExtension(filePath: string): string {
  const lastSegment = filePath.split("/").pop() ?? filePath;
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return lastSegment.slice(dotIndex + 1).toLowerCase();
}

export async function readMarkdown(
  source: import("@riebeckite/core").ContentSource,
  entry: import("@riebeckite/core").ContentSourceEntry,
): Promise<string> {
  const content = await source.read(entry);
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

export function normalizeRelativePath(parts: readonly string[]): string {
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalized.length === 0) return "..";
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}
