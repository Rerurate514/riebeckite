import { createHash } from "node:crypto";
import sharp, { type Metadata, type Sharp } from "sharp";
import type {
  CachedAssetTransform,
  CachedAssetTransformOutput,
  ImageOptimizerStats,
  ResolvedImageOptimizerOptions,
} from "./index_part1.js";

export function emptyStats(): ImageOptimizerStats {
  return {
    inputs: 0,
    variants: 0,
    cacheHits: 0,
    cacheMisses: 0,
    outputBytes: 0,
    skipped: [],
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extensionOf(path: string): string {
  return path.slice(path.lastIndexOf(".") + 1).toLowerCase();
}

export function variantPath(
  path: string,
  width: number,
  format: "webp" | "avif",
): string {
  const extensionStart = path.lastIndexOf(".");
  return `${path.slice(0, extensionStart)}-${width}.${format}`;
}

export function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function cacheVersion(options: ResolvedImageOptimizerOptions): string {
  return JSON.stringify({
    version: "image-optimizer-v2",
    options,
    sharp: sharp.versions,
  });
}

export function assetCacheKey(path: string, input: Uint8Array): string {
  return createHash("sha256").update(path).update(input).digest("hex");
}

export async function transformImage(
  sourcePath: string,
  image: Sharp,
  metadata: Metadata,
  options: ResolvedImageOptimizerOptions,
) {
  const outputs = [];
  for (const width of options.widths) {
    if (width >= metadata.width) continue;
    for (const format of options.formats) {
      const output = image.clone().resize({ width, withoutEnlargement: true });
      if (options.keepMetadata) output.withMetadata();
      const content =
        format === "avif"
          ? await output.avif({ quality: options.quality }).toBuffer()
          : await output.webp({ quality: options.quality }).toBuffer();
      outputs.push({
        sourcePath,
        path: variantPath(sourcePath, width, format),
        content,
        mimeType: `image/${format}`,
        width,
        height: Math.round((metadata.height ?? 0) * (width / metadata.width)),
      });
    }
  }
  return outputs;
}

export function serializeOutputs(
  outputs: readonly {
    path: string;
    content: Uint8Array;
    mimeType: string;
    width: number;
    height: number;
  }[],
): CachedAssetTransformOutput[] {
  return outputs.map((output) => ({
    path: output.path,
    content: Buffer.from(output.content).toString("base64"),
    mimeType: output.mimeType,
    width: output.width,
    height: output.height,
  }));
}

export function isCachedAssetTransform(
  value: CachedAssetTransform | undefined,
): value is CachedAssetTransform {
  return (
    Array.isArray(value?.outputs) &&
    value.outputs.every(
      (output) =>
        typeof output.path === "string" &&
        typeof output.content === "string" &&
        typeof output.mimeType === "string" &&
        Number.isInteger(output.width) &&
        Number.isInteger(output.height),
    )
  );
}

export function restoreCachedOutputs(
  sourcePath: string,
  cached: CachedAssetTransform,
) {
  return cached.outputs.map((output) => ({
    sourcePath,
    path: output.path,
    content: Buffer.from(output.content, "base64"),
    mimeType: output.mimeType,
    width: output.width,
    height: output.height,
  }));
}
