import { definePlugin } from "@riebeckite/core";
import sharp, { type Metadata } from "sharp";
import {
  assetCacheKey,
  boundedInteger,
  cacheVersion,
  emptyStats,
  extensionOf,
  formatBytes,
  isCachedAssetTransform,
  restoreCachedOutputs,
  serializeOutputs,
  transformImage,
} from "./index_part2.js";

export type ImageOptimizerOptions = {
  widths?: readonly number[];
  formats?: readonly ("webp" | "avif")[];
  quality?: number;
  keepMetadata?: boolean;
  maxInputBytes?: number;
};

export type ResolvedImageOptimizerOptions = Required<ImageOptimizerOptions>;

export const PLUGIN_NAME = "image-optimizer";

export const SUPPORTED_INPUTS = new Set(["avif", "jpeg", "jpg", "png", "webp"]);

export const SUPPORTED_FORMATS = new Set(["avif", "webp"]);

export const DEFAULT_MAX_INPUT_BYTES = 50 * 1024 * 1024;

export type CachedAssetTransform = {
  readonly outputs: CachedAssetTransformOutput[];
};

export type CachedAssetTransformOutput = {
  readonly path: string;
  readonly content: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
};

export type ImageOptimizerStats = {
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
