import {
  IMAGE_EXTENSIONS,
  isAttachmentPath,
  isExcluded,
  isPublishable,
} from "@riebeckite/core";
import { createContentSource } from "@riebeckite/node";
import { type ParsedFrontmatter, parseFrontmatter } from "./frontmatter.js";
import type { AnalyzerContentConfig } from "./types.js";
import {
  addToIndex,
  extractBlockIds,
  extractHeadings,
  getExtension,
  normalizeMarkdown,
  normalizeRelativePath,
  readMarkdown,
  resolveNoteLanguage,
} from "./vault_part2.js";

export const NOTE_EXTENSION = "md";

export const WIKILINK_TARGET_PATTERN =
  /(!)?\[\[([^\]|#^]+)(?:#(\^?[^\]|]+))?(?:\|[^\]]+)?\]\]/g;

export type ScannedNote = {
  relativePath: string;
  slug: string;
  language?: string;
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
  targetIndex: Map<string, ResolvedTarget>;
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
  const source = createContentSource(config);
  const targetIndex = new Map<string, ResolvedTarget>();
  const filePaths = new Set<string>();
  const noteSlugs = new Set<string>();
  const noteBySlug = new Map<string, ScannedNote>();
  const assetPaths = new Set<string>();
  const assets: ScannedAsset[] = [];
  const includedNotes: ScannedNote[] = [];
  const excludedNotes: ScannedNote[] = [];

  const entries = await source.scan();

  for (const entry of entries) {
    const relative = entry.path;
    filePaths.add(relative);
    const excluded = isExcluded(config.exclude, relative);
    const extension = getExtension(relative);

    if (extension === NOTE_EXTENSION) {
      const slug = relative.slice(0, -NOTE_EXTENSION.length - 1);
      const markdown = normalizeMarkdown(await readMarkdown(source, entry));
      const fm = parseFrontmatter(markdown);
      const note: ScannedNote = {
        relativePath: relative,
        slug,
        language: resolveNoteLanguage(
          relative,
          fm.values.lang,
          config.languages,
        ),
        markdown,
        fm,
        headings: extractHeadings(markdown),
        blockIds: extractBlockIds(markdown),
        excluded,
        published: isPublishable(config.publishStrategy, fm.values),
      };

      if (excluded) {
        excludedNotes.push(note);
        continue;
      }

      includedNotes.push(note);
      noteSlugs.add(slug);
      noteBySlug.set(slug, note);
      addToIndex(targetIndex, slug, "note", fm);
      continue;
    }

    if (excluded) continue;

    addToIndex(
      targetIndex,
      relative,
      IMAGE_EXTENSIONS.includes(extension) ? "image" : "attachment",
    );
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
  targetIndex: Map<string, ResolvedTarget>,
): ResolvedTarget | null {
  let key = target.trim().toLowerCase();
  if (key.endsWith(`.${NOTE_EXTENSION}`)) {
    key = key.slice(0, -NOTE_EXTENSION.length - 1);
  }
  return targetIndex.get(key) ?? null;
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

  const base = noteSlug.split("/").slice(0, -1);
  const resolved = normalizeRelativePath([...base, ...decoded.split("/")]);
  if (resolved === ".." || resolved.startsWith("../")) return null;
  return resolved;
}
