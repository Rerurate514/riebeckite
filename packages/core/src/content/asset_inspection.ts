import crypto from "node:crypto";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import { isImagePath, normalizeContentPath } from "./attachment.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";

export const DEFAULT_LARGE_ASSET_BYTES = 512 * 1024;
const MODERN_FORMAT_BYTES = 100 * 1024;
const LEGACY_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "bmp"]);

export type ContentAssetUsage = "used" | "possibly-unused" | "unused";

export type ContentAssetInspectionEntry = {
  readonly path: string;
  readonly size: number;
  readonly extension: string;
  readonly kind: "image" | "asset";
  readonly hash: string;
  readonly references: readonly string[];
  readonly usage: ContentAssetUsage;
  readonly reasons: readonly string[];
};

export type ContentAssetDuplicateGroup = {
  readonly hash: string;
  readonly size: number;
  readonly paths: readonly string[];
};

export type ContentAssetOptimization = {
  readonly path: string;
  readonly size: number;
  readonly kind: "large" | "modern-format";
  readonly recommendation: string;
};

export type ContentAssetFormatSummary = {
  readonly extension: string;
  readonly kind: "image" | "asset";
  readonly count: number;
  readonly bytes: number;
};

export type ContentAssetInspection = {
  readonly version: 1;
  readonly largeThresholdBytes: number;
  readonly totals: {
    readonly assets: number;
    readonly bytes: number;
    readonly used: number;
    readonly possiblyUnused: number;
    readonly unused: number;
    readonly unusedBytes: number;
    readonly large: number;
    readonly duplicates: number;
    readonly duplicateBytes: number;
  };
  readonly formats: readonly ContentAssetFormatSummary[];
  readonly assets: readonly ContentAssetInspectionEntry[];
  readonly duplicates: readonly ContentAssetDuplicateGroup[];
  readonly optimizations: readonly ContentAssetOptimization[];
};

export type ContentAssetInspectionOptions = {
  readonly largeAssetBytes?: number;
  readonly isContentPath?: (path: string) => boolean;
  readonly contentDependencies?: ReadonlyMap<string, readonly string[]>;
};

export async function inspectContentAssets(
  manifest: ContentManifest,
  source: ContentSource,
  options: ContentAssetInspectionOptions = {},
): Promise<ContentAssetInspection> {
  const largeThresholdBytes =
    options.largeAssetBytes ?? DEFAULT_LARGE_ASSET_BYTES;
  const entries = await source.scan();
  const isContentPath =
    options.isContentPath ??
    ((path: string) => path.toLowerCase().endsWith(".md"));
  const assets = entries.filter(
    (entry) => entry.path.toLowerCase() !== "" && !isContentPath(entry.path),
  );
  const references = new Map(
    assets.map((entry) => [
      normalizeContentPath(entry.path),
      referencedBy(manifest.byAsset.get(normalizeContentPath(entry.path))),
    ]),
  );
  const dependencyReferences = collectDependencyReferences(
    manifest,
    options.contentDependencies,
  );
  const markdown = await readMarkdown(entries, source, isContentPath);
  const inspected: ContentAssetInspectionEntry[] = [];
  for (const entry of assets) {
    const content = await source.read(entry);
    const bytes = toBytes(content);
    const path = normalizeContentPath(entry.path);
    const extension = extensionOf(path);
    const manifestReferences = references.get(path) ?? [];
    const dependencyEntries = dependencyReferences.get(path) ?? [];
    const referencing = [
      ...new Map(
        [...manifestReferences, ...dependencyEntries].map((entry) => [
          entry.slug,
          entry,
        ]),
      ).values(),
    ];
    const usage = resolveUsage(referencing, path, markdown);
    inspected.push({
      path,
      size: bytes.byteLength,
      extension,
      kind: isImagePath(path) ? "image" : "asset",
      hash: crypto.createHash("sha256").update(bytes).digest("hex"),
      references: referencing.map((entry) => entry.slug),
      usage: usage.usage,
      reasons: usage.reasons,
    });
  }
  inspected.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return buildReport(inspected, largeThresholdBytes);
}

function referencedBy(
  entries: readonly ContentManifestEntry[] | undefined,
): readonly ContentManifestEntry[] {
  return entries ?? [];
}

function collectDependencyReferences(
  manifest: ContentManifest,
  dependencies: ReadonlyMap<string, readonly string[]> | undefined,
): ReadonlyMap<string, readonly ContentManifestEntry[]> {
  const references = new Map<string, ContentManifestEntry[]>();
  if (!dependencies) return references;
  const entriesByPath = new Map(
    manifest.entries.flatMap((entry) =>
      entry.sourcePath
        ? [[normalizeContentPath(entry.sourcePath), entry] as const]
        : [],
    ),
  );
  for (const [sourcePath, paths] of dependencies) {
    const source = entriesByPath.get(normalizeContentPath(sourcePath));
    if (!source) continue;
    for (const dependencyPath of paths) {
      const key = normalizeContentPath(dependencyPath);
      const values = references.get(key) ?? [];
      values.push(source);
      references.set(key, values);
    }
  }
  return references;
}

function resolveUsage(
  references: readonly ContentManifestEntry[],
  path: string,
  markdown: readonly string[],
): {
  readonly usage: ContentAssetUsage;
  readonly reasons: readonly string[];
} {
  const routable = references.filter((entry) => entry.publishing.routable);
  if (routable.length > 0) return { usage: "used", reasons: [] };
  if (references.length > 0) {
    return {
      usage: "possibly-unused",
      reasons: ["referenced only by draft or scheduled content"],
    };
  }
  const name = path.split("/").at(-1) ?? path;
  if (markdown.some((text) => text.includes(path) || text.includes(name))) {
    return {
      usage: "possibly-unused",
      reasons: ["referenced outside standard Markdown image syntax"],
    };
  }
  return { usage: "unused", reasons: ["not referenced by any note"] };
}

async function readMarkdown(
  entries: readonly ContentSourceEntry[],
  source: ContentSource,
  isContentPath: (path: string) => boolean,
): Promise<readonly string[]> {
  const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
  const texts: string[] = [];
  for (const entry of entries) {
    if (!isContentPath(entry.path)) continue;
    const content = await source.read(entry);
    texts.push(typeof content === "string" ? content : decoder.decode(content));
  }
  return texts;
}

function buildReport(
  assets: readonly ContentAssetInspectionEntry[],
  largeThresholdBytes: number,
): ContentAssetInspection {
  const formats = new Map<
    string,
    { kind: "image" | "asset"; count: number; bytes: number }
  >();
  const hashGroups = new Map<string, { size: number; paths: string[] }>();
  const optimizations: ContentAssetOptimization[] = [];
  let bytes = 0;
  let used = 0;
  let possiblyUnused = 0;
  let unused = 0;
  let unusedBytes = 0;
  let large = 0;

  for (const asset of assets) {
    bytes += asset.size;
    if (asset.usage === "used") used += 1;
    if (asset.usage === "possibly-unused") possiblyUnused += 1;
    if (asset.usage === "unused") {
      unused += 1;
      unusedBytes += asset.size;
    }
    const format = formats.get(`${asset.kind}:${asset.extension}`) ?? {
      kind: asset.kind,
      count: 0,
      bytes: 0,
    };
    format.count += 1;
    format.bytes += asset.size;
    formats.set(`${asset.kind}:${asset.extension}`, format);

    if (asset.size > 0) {
      const group = hashGroups.get(asset.hash) ?? {
        size: asset.size,
        paths: [],
      };
      group.paths.push(asset.path);
      hashGroups.set(asset.hash, group);
    }

    if (asset.size >= largeThresholdBytes) {
      large += 1;
      optimizations.push({
        path: asset.path,
        size: asset.size,
        kind: "large",
        recommendation:
          asset.kind === "image"
            ? "Resize or compress this image; consider WebP or AVIF for photographs."
            : "Review this asset and remove it if it is no longer needed.",
      });
    } else if (
      asset.kind === "image" &&
      asset.size >= MODERN_FORMAT_BYTES &&
      LEGACY_IMAGE_EXTENSIONS.has(asset.extension)
    ) {
      optimizations.push({
        path: asset.path,
        size: asset.size,
        kind: "modern-format",
        recommendation: "Consider WebP or AVIF to reduce transfer size.",
      });
    }
  }

  const duplicates = [...hashGroups.entries()]
    .filter(([, group]) => group.paths.length > 1)
    .map(([hash, group]) => ({
      hash,
      size: group.size,
      paths: group.paths.toSorted((left, right) =>
        left.localeCompare(right, "en"),
      ),
    }))
    .toSorted(
      (left, right) =>
        right.size * (right.paths.length - 1) -
          left.size * (left.paths.length - 1) ||
        left.paths[0]?.localeCompare(right.paths[0] ?? "", "en") ||
        0,
    );
  optimizations.sort(
    (left, right) =>
      right.size - left.size || left.path.localeCompare(right.path, "en"),
  );

  return {
    version: 1,
    largeThresholdBytes,
    totals: {
      assets: assets.length,
      bytes,
      used,
      possiblyUnused,
      unused,
      unusedBytes,
      large,
      duplicates: duplicates.reduce(
        (count, group) => count + group.paths.length,
        0,
      ),
      duplicateBytes: duplicates.reduce(
        (count, group) => count + group.size * (group.paths.length - 1),
        0,
      ),
    },
    formats: [...formats.entries()]
      .map(([key, value]) => ({
        extension: key.slice(key.indexOf(":") + 1),
        kind: value.kind,
        count: value.count,
        bytes: value.bytes,
      }))
      .toSorted(
        (left, right) =>
          left.kind.localeCompare(right.kind) ||
          left.extension.localeCompare(right.extension, "en"),
      ),
    assets,
    duplicates,
    optimizations,
  };
}

function extensionOf(path: string): string {
  const name = path.split("/").at(-1) ?? "";
  const index = name.lastIndexOf(".");
  return index <= 0 ? "(none)" : name.slice(index + 1).toLowerCase();
}

function toBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? Buffer.from(content, "utf8") : content;
}
