import {
  attachmentUrl,
  type ContentManifest,
} from "@riebeckite/core";
import {
  type ResponsiveImageOptions,
  resolveResponsiveImageOptions,
} from "./options.js";
import type {
  ResponsiveImagePlan,
  ResponsiveImageSource,
  ResponsiveImageVariant,
} from "./types.js";

const FORMAT_MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jxl: "image/jxl",
  png: "image/png",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  webp: "image/webp",
};

/**
 * Build the deterministic `<picture>` plan for a single image.
 *
 * Variants are only used when they already exist in `existingPaths`; the helper
 * never fabricates URLs for files that are not part of the content manifest.
 */
export function buildResponsiveSrcset(
  existingPaths: Iterable<string>,
  src: string,
  options: ResponsiveImageOptions = {},
): ResponsiveImagePlan {
  const resolved = resolveResponsiveImageOptions(options);
  const known = toPathSet(existingPaths);
  const match = matchKnownAsset(known, src);

  if (!match) {
    return { hasVariants: false, assetPath: null, sources: [], imgSrcset: "" };
  }

  const split = splitAssetPath(match.path);
  if (!split) {
    return { hasVariants: false, assetPath: null, sources: [], imgSrcset: "" };
  }

  const variants = collectVariants(split, resolved, known);
  const urlFor = (path: string): string =>
    match.kind === "attachment"
      ? attachmentUrl(path)
      : `/${encodeAssetPath(path)}`;

  const sources: ResponsiveImageSource[] = [];
  for (const format of resolved.formats) {
    if (format === split.extension) continue;
    const widthVariants = variants
      .filter((variant) => variant.format === format && variant.width !== undefined)
      .toSorted((a, b) => (a.width ?? 0) - (b.width ?? 0));

    if (widthVariants.length > 0) {
      sources.push({
        type: mimeTypeFor(format),
        srcset: widthVariants
          .map((variant) => `${urlFor(variant.path)} ${variant.width}w`)
          .join(", "),
      });
      continue;
    }

    const plainVariant = variants.find(
      (variant) => variant.format === format && variant.width === undefined,
    );
    if (plainVariant) {
      sources.push({
        type: mimeTypeFor(format),
        srcset: urlFor(plainVariant.path),
      });
    }
  }

  const baseWidthVariants = variants
    .filter(
      (variant) =>
        variant.format === split.extension && variant.width !== undefined,
    )
    .toSorted((a, b) => (a.width ?? 0) - (b.width ?? 0));

  const imgSrcset = baseWidthVariants
    .map((variant) => `${urlFor(variant.path)} ${variant.width}w`)
    .join(", ");

  return {
    hasVariants: sources.length > 0 || imgSrcset !== "",
    assetPath: match.path,
    sources,
    imgSrcset,
  };
}

/** Collect every asset path the content manifest knows about. */
export function collectKnownAssetPaths(
  manifest: ContentManifest,
): Set<string> {
  const paths = new Set<string>();

  for (const entry of manifest.entries) {
    for (const asset of entry.assets) paths.add(asset.path);
  }
  for (const path of manifest.byAsset.keys()) paths.add(path);

  return paths;
}

type SplitAssetPath = {
  directory: string;
  stem: string;
  extension: string;
};

type AssetMatch = {
  path: string;
  kind: "asset" | "attachment";
};

function collectVariants(
  split: SplitAssetPath,
  options: ReturnType<typeof resolveResponsiveImageOptions>,
  known: Set<string>,
): ResponsiveImageVariant[] {
  const variants = new Map<string, ResponsiveImageVariant>();

  const add = (path: string, format: string, width?: number) => {
    if (path === joinAssetPath(split)) return;
    if (!known.has(path)) return;
    if (variants.has(path)) return;
    variants.set(path, { path, format, width });
  };

  for (const format of options.formats) {
    for (const width of options.widths) {
      add(`${split.directory}${split.stem}-${width}.${format}`, format, width);
    }
    add(`${split.directory}${split.stem}.${format}`, format);
  }

  for (const width of options.widths) {
    add(
      `${split.directory}${split.stem}-${width}.${split.extension}`,
      split.extension,
      width,
    );
  }

  return [...variants.values()];
}

function matchKnownAsset(
  known: Set<string>,
  src: string,
): AssetMatch | null {
  const clean = stripQueryAndFragment(src);
  if (!clean || hasUrlScheme(clean)) return null;

  const normalized = clean.startsWith("/") ? clean : `/${clean}`;

  for (const path of known) {
    if (normalized === `/${encodeAssetPath(path)}`) {
      return { path, kind: "asset" };
    }
    if (normalized === attachmentUrl(path)) {
      return { path, kind: "attachment" };
    }
  }

  return null;
}

function splitAssetPath(path: string): SplitAssetPath | null {
  const lastSlash = path.lastIndexOf("/");
  const directory = path.slice(0, lastSlash + 1);
  const fileName = path.slice(lastSlash + 1);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return null;

  return {
    directory,
    stem: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex + 1).toLowerCase(),
  };
}

function joinAssetPath(split: SplitAssetPath): string {
  return `${split.directory}${split.stem}.${split.extension}`;
}

function mimeTypeFor(format: string): string {
  return FORMAT_MIME_TYPES[format] ?? `image/${format}`;
}

function toPathSet(paths: Iterable<string>): Set<string> {
  return paths instanceof Set ? paths : new Set(paths);
}

function stripQueryAndFragment(value: string): string {
  return value.split(/[?#]/, 1)[0] ?? "";
}

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function encodeAssetPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
