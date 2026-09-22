import fs from "node:fs/promises";
import path from "node:path";
import {
  IMAGE_EXTENSIONS,
  isAttachmentPath,
  isExcluded,
} from "@riebeckite/core";
import {
  isNotePublic,
  type ParsedFrontmatter,
  parseFrontmatter,
} from "./frontmatter.js";
import type { AnalyzerContentConfig } from "./types.js";

const NOTE_EXTENSION = "md";
const WIKILINK_TARGET_PATTERN =
  /(!)?\[\[([^\]|#^]+)(?:#(\^?[^\]|]+))?(?:\|[^\]]+)?\]\]/g;

export type ScannedNote = {
  relativePath: string;
  slug: string;
  markdown: string;
  fm: ParsedFrontmatter;
  headings: Set<string>;
  blockIds: Set<string>;
  excluded: boolean;
  published: boolean;
};

export type ScannedAsset = {
  relativePath: string;
  extension: string;
};

export type ScanResult = {
  includedNotes: ScannedNote[];
  excludedNotes: ScannedNote[];
  noteSlugs: Set<string>;
  noteBySlug: Map<string, ScannedNote>;
  assetPaths: Set<string>;
  assets: ScannedAsset[];
  filePaths: Set<string>;
  targetIndex: Map<string, string>;
};

export type TargetKind = "note" | "image" | "attachment";

export type ResolvedTarget = {
  kind: TargetKind;
  value: string;
};

export type WikilinkMatch = {
  embed: boolean;
  target: string;
  fragment: string | null;
  index: number;
};

export async function scanVault(
  config: AnalyzerContentConfig,
): Promise<ScanResult> {
  const directory = config.directory;
  const targetIndex = new Map<string, string>();
  const filePaths = new Set<string>();
  const noteSlugs = new Set<string>();
  const noteBySlug = new Map<string, ScannedNote>();
  const assetPaths = new Set<string>();
  const assets: ScannedAsset[] = [];
  const includedNotes: ScannedNote[] = [];
  const excludedNotes: ScannedNote[] = [];

  const entries = await fs.readdir(directory, {
    withFileTypes: true,
    recursive: true,
  });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const relative = toPosixPath(
      path.relative(directory, path.join(entry.parentPath, entry.name)),
    );
    filePaths.add(relative);
    const excluded = isExcluded(config.exclude, relative);
    const extension = getExtension(relative);

    if (extension === NOTE_EXTENSION) {
      const slug = relative.slice(0, -NOTE_EXTENSION.length - 1);
      const markdown = normalizeMarkdown(
        await fs.readFile(
          path.join(directory, ...relative.split("/")),
          "utf-8",
        ),
      );
      const fm = parseFrontmatter(markdown);
      const note: ScannedNote = {
        relativePath: relative,
        slug,
        markdown,
        fm,
        headings: extractHeadings(markdown),
        blockIds: extractBlockIds(markdown),
        excluded,
        published: isNotePublic(config.publishStrategy, fm.values),
      };

      if (excluded) {
        excludedNotes.push(note);
        continue;
      }

      includedNotes.push(note);
      noteSlugs.add(slug);
      noteBySlug.set(slug, note);
      addToIndex(targetIndex, slug, fm);
      continue;
    }

    if (excluded) continue;

    addToIndex(targetIndex, relative);
    if (IMAGE_EXTENSIONS.includes(extension)) {
      assetPaths.add(relative);
      assets.push({ relativePath: relative, extension });
    }
  }

  return {
    includedNotes,
    excludedNotes,
    noteSlugs,
    noteBySlug,
    assetPaths,
    assets,
    filePaths,
    targetIndex,
  };
}

export function getWikilinkMatches(markdown: string): WikilinkMatch[] {
  WIKILINK_TARGET_PATTERN.lastIndex = 0;
  const matches: WikilinkMatch[] = [];
  for (
    let match = WIKILINK_TARGET_PATTERN.exec(markdown);
    match !== null;
    match = WIKILINK_TARGET_PATTERN.exec(markdown)
  ) {
    const target = match[2]?.trim();
    if (!target) continue;
    const fragment = match[3]?.trim() || null;
    matches.push({
      embed: match[1] === "!",
      target,
      fragment,
      index: match.index,
    });
  }
  return matches;
}

export function resolveWikilinkTarget(
  target: string,
  targetIndex: Map<string, string>,
): ResolvedTarget | null {
  let key = target.trim().toLowerCase();
  if (key.endsWith(`.${NOTE_EXTENSION}`)) {
    key = key.slice(0, -NOTE_EXTENSION.length - 1);
  }
  const value = targetIndex.get(key);
  if (!value) return null;

  const extension = getExtension(value);
  if (extension === NOTE_EXTENSION) return { kind: "note", value };
  if (IMAGE_EXTENSIONS.includes(extension)) return { kind: "image", value };
  return { kind: "attachment", value };
}

export function isImageTarget(target: string): boolean {
  const extension = getExtension(target);
  return IMAGE_EXTENSIONS.includes(extension);
}

export function isAssetTarget(target: string): boolean {
  return isImageTarget(target) || isAttachmentPath(target);
}

export function resolveLocalReference(
  noteSlug: string,
  url: string,
): string | null {
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  if (url.startsWith("#")) return null;
  if (url.startsWith("/")) return null;

  const withoutAnchor = url.split(/[?#]/)[0];
  if (!withoutAnchor) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutAnchor);
  } catch {
    return null;
  }

  const base = path.posix.dirname(noteSlug);
  const resolved = path.posix.normalize(path.posix.join(base, decoded));
  if (resolved === ".." || resolved.startsWith("../")) return null;
  return resolved;
}

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

  return path.posix.normalize(decoded);
}

function addToIndex(
  targetIndex: Map<string, string>,
  value: string,
  fm?: ParsedFrontmatter,
) {
  const parts = value.split("/");
  for (let i = parts.length - 1; i >= 0; i--) {
    const key = parts.slice(i).join("/").toLowerCase();
    if (!targetIndex.has(key)) targetIndex.set(key, value);
  }

  if (fm) {
    const aliases = fm.values.aliases;
    const aliasList = Array.isArray(aliases)
      ? aliases.filter((alias): alias is string => typeof alias === "string")
      : [];
    for (const alias of aliasList) {
      const key = alias.trim().toLowerCase();
      if (key && !targetIndex.has(key)) targetIndex.set(key, value);
    }
    return;
  }

  const stemValue = value.replace(/\.[^/.]+$/, "");
  if (stemValue !== value) {
    const stemParts = stemValue.split("/");
    for (let i = stemParts.length - 1; i >= 0; i--) {
      const key = stemParts.slice(i).join("/").toLowerCase();
      if (!targetIndex.has(key)) targetIndex.set(key, value);
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

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n");
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

export function getExtension(filePath: string): string {
  const lastSegment = filePath.split("/").pop() ?? filePath;
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return lastSegment.slice(dotIndex + 1).toLowerCase();
}
