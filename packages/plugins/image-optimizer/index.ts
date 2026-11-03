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

type ImageOptimizerStats = {
  inputs: number;
  variants: number;
  cacheHits: number;
  cacheMisses: number;
  outputBytes: number;
  skipped: { path: string; reason: string }[];
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
  let stats: ImageOptimizerStats = emptyStats();

  return definePlugin({
    name: PLUGIN_NAME,
    order: 50,
    provides: ["image-transforms"],
    cacheVersion: cacheVersion(resolved),
    options,
    transformAssets: async ({ assets, readAsset, cache, logger, tracer }) => {
      const outputs = [];
      stats = emptyStats();
      for (const asset of assets) {
        const extension = extensionOf(asset.path);
        if (!SUPPORTED_INPUTS.has(extension)) continue;
        stats.inputs += 1;
        if (asset.size !== undefined && asset.size > resolved.maxInputBytes) {
          stats.skipped.push({ path: asset.path, reason: "oversized" });
          logger.warn(`Skipped oversized image asset: ${asset.path}`);
          continue;
        }
        const input = await readAsset(asset.path);
        if (!input || input.byteLength > resolved.maxInputBytes) {
          stats.skipped.push({ path: asset.path, reason: "unreadable" });
          logger.warn(
            `Skipped oversized or unreadable image asset: ${asset.path}`,
          );
          continue;
        }
        const cacheKey = assetCacheKey(asset.path, input);
        const cached = await cache.get<CachedAssetTransform>(cacheKey);
        if (isCachedAssetTransform(cached)) {
          const restored = restoreCachedOutputs(asset.path, cached);
          stats.cacheHits += 1;
          stats.variants += restored.length;
          stats.outputBytes += restored.reduce(
            (total, output) => total + output.content.byteLength,
            0,
          );
          tracer.event("image-transform.cache-hit", { path: asset.path });
          outputs.push(...restored);
          continue;
        }
        stats.cacheMisses += 1;
        const image = sharp(input, {
          animated: false,
          failOn: "error",
          limitInputPixels: 268_402_689,
        });
        let metadata: Metadata;
        try {
          metadata = await image.metadata();
        } catch {
          stats.skipped.push({ path: asset.path, reason: "unreadable" });
          logger.warn(`Skipped unreadable image asset: ${asset.path}`);
          continue;
        }
        if (
          !metadata.width ||
          !metadata.format ||
          !SUPPORTED_INPUTS.has(metadata.format)
        ) {
          stats.skipped.push({ path: asset.path, reason: "unsupported" });
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
          stats.variants += transformed.length;
          stats.outputBytes += transformed.reduce(
            (total, output) => total + output.content.byteLength,
            0,
          );
          outputs.push(...transformed);
        } catch {
          stats.skipped.push({ path: asset.path, reason: "transform failed" });
          logger.warn(
            `Skipped image asset that could not be transformed: ${asset.path}`,
          );
        }
      }
      return outputs;
    },
    inspector: {
      apiVersion: 1,
      tabs: [
        {
          id: "image-optimizer",
          title: { en: "Image optimization", ja: "画像最適化" },
          description: {
            en: "Generated variants, cache use, and skipped assets.",
            ja: "生成したバリアント、キャッシュ利用、スキップしたアセットを表示します。",
          },
          order: 22,
          collect: () => ({
            kind: "key-value",
            items: [
              { key: { en: "Inputs", ja: "入力" }, value: stats.inputs },
              {
                key: { en: "Generated variants", ja: "生成バリアント" },
                value: stats.variants,
              },
              {
                key: { en: "Cache hits", ja: "キャッシュヒット" },
                value: stats.cacheHits,
              },
              {
                key: { en: "Cache misses", ja: "キャッシュミス" },
                value: stats.cacheMisses,
              },
              {
                key: { en: "Output size", ja: "出力サイズ" },
                value: formatBytes(stats.outputBytes),
              },
              {
                key: { en: "Skipped", ja: "スキップ" },
                value: stats.skipped.length,
              },
              ...(stats.skipped.length > 0
                ? [
                    {
                      key: { en: "Skipped assets", ja: "スキップしたアセット" },
                      value: stats.skipped
                        .slice(0, 20)
                        .map((skipped) => `${skipped.path} (${skipped.reason})`)
                        .join("; "),
                    },
                  ]
                : []),
            ],
          }),
        },
      ],
    },
  });
}

function emptyStats(): ImageOptimizerStats {
  return {
    inputs: 0,
    variants: 0,
    cacheHits: 0,
    cacheMisses: 0,
    outputBytes: 0,
    skipped: [],
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
