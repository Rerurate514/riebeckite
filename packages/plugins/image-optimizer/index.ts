import { createHash } from "node:crypto";
import { definePlugin } from "@riebeckite/core";
import type { Metadata, Sharp } from "sharp";
import sharp from "sharp";

export type ImageOptimizerOptions = {
  widths?: readonly number[];
  formats?: readonly ("webp" | "avif")[];
  quality?: number;
  keepMetadata?: boolean;
  maxInputBytes?: number;
};

export type ResolvedImageOptimizerOptions = Required<ImageOptimizerOptions>;

const PLUGIN_NAME = "image-optimizer";
const SUPPORTED_INPUTS = new Set(["avif", "jpeg", "jpg", "png", "webp"]);
const SUPPORTED_FORMATS = new Set(["avif", "webp"]);
const DEFAULT_MAX_INPUT_BYTES = 50 * 1024 * 1024;

type CachedAssetTransform = {
  readonly outputs: CachedAssetTransformOutput[];
};

type CachedAssetTransformOutput = {
  readonly path: string;
  readonly content: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
};

export function resolveImageOptimizerOptions(
  options: ImageOptimizerOptions = {},
): ResolvedImageOptimizerOptions {
  return {
    widths: [...new Set(options.widths ?? [640, 1280, 1920])]
      .filter((width) => Number.isInteger(width) && width > 0)
      .toSorted((left, right) => left - right),
    formats: [
      ...new Set(
        (options.formats ?? (["webp", "avif"] as const)).filter((format) =>
          SUPPORTED_FORMATS.has(format),
        ),
      ),
    ],
    quality: boundedInteger(options.quality, 80, 1, 100),
    keepMetadata: options.keepMetadata ?? false,
    maxInputBytes: boundedInteger(
      options.maxInputBytes,
      DEFAULT_MAX_INPUT_BYTES,
      1,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}

export function imageOptimizer(options: ImageOptimizerOptions = {}) {
  const resolved = resolveImageOptimizerOptions(options);

  return definePlugin({
    name: PLUGIN_NAME,
    order: 50,
    provides: ["image-transforms"],
    cacheVersion: cacheVersion(resolved),
    options,
    transformAssets: async ({ assets, readAsset, cache, logger, tracer }) => {
      const outputs = [];
      for (const asset of assets) {
        const extension = extensionOf(asset.path);
        if (!SUPPORTED_INPUTS.has(extension)) continue;
        if (asset.size !== undefined && asset.size > resolved.maxInputBytes) {
          logger.warn(`Skipped oversized image asset: ${asset.path}`);
          continue;
        }
        const input = await readAsset(asset.path);
        if (!input || input.byteLength > resolved.maxInputBytes) {
          logger.warn(
            `Skipped oversized or unreadable image asset: ${asset.path}`,
          );
          continue;
        }
        const cacheKey = assetCacheKey(asset.path, input);
        const cached = await cache.get<CachedAssetTransform>(cacheKey);
        if (isCachedAssetTransform(cached)) {
          tracer.event("image-transform.cache-hit", { path: asset.path });
          outputs.push(...restoreCachedOutputs(asset.path, cached));
          continue;
        }
        const image = sharp(input, {
          animated: false,
          failOn: "error",
          limitInputPixels: 268_402_689,
        });
        let metadata: Metadata;
        try {
          metadata = await image.metadata();
        } catch {
          logger.warn(`Skipped unreadable image asset: ${asset.path}`);
          continue;
        }
        if (
          !metadata.width ||
          !metadata.format ||
          !SUPPORTED_INPUTS.has(metadata.format)
        ) {
          continue;
        }
        try {
          const transformed = await transformImage(
            asset.path,
            image,
            metadata,
            resolved,
          );
          await cache.set(cacheKey, { outputs: serializeOutputs(transformed) });
          tracer.event("image-transform.run", { path: asset.path });
          outputs.push(...transformed);
        } catch {
          logger.warn(
            `Skipped image asset that could not be transformed: ${asset.path}`,
          );
        }
      }
      return outputs;
    },
  });
}

function extensionOf(path: string): string {
  return path.slice(path.lastIndexOf(".") + 1).toLowerCase();
}

function variantPath(
  path: string,
  width: number,
  format: "webp" | "avif",
): string {
  const extensionStart = path.lastIndexOf(".");
  return `${path.slice(0, extensionStart)}-${width}.${format}`;
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function cacheVersion(options: ResolvedImageOptimizerOptions): string {
  return JSON.stringify({
    version: "image-optimizer-v2",
    options,
    sharp: sharp.versions,
  });
}

function assetCacheKey(path: string, input: Uint8Array): string {
  return createHash("sha256").update(path).update(input).digest("hex");
}

async function transformImage(
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

function serializeOutputs(
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

function isCachedAssetTransform(
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

function restoreCachedOutputs(
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
