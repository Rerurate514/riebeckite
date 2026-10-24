import { definePlugin } from "@riebeckite/core";
import type { Metadata } from "sharp";
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
const DEFAULT_MAX_INPUT_BYTES = 50 * 1024 * 1024;

export function resolveImageOptimizerOptions(
  options: ImageOptimizerOptions = {},
): ResolvedImageOptimizerOptions {
  return {
    widths: [...new Set(options.widths ?? [640, 1280, 1920])]
      .filter((width) => Number.isInteger(width) && width > 0)
      .toSorted((left, right) => left - right),
    formats: [...new Set(options.formats ?? (["webp", "avif"] as const))],
    quality: Math.min(100, Math.max(1, Math.round(options.quality ?? 80))),
    keepMetadata: options.keepMetadata ?? false,
    maxInputBytes: Math.max(
      1,
      Math.round(options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES),
    ),
  };
}

export function imageOptimizer(options: ImageOptimizerOptions = {}) {
  const resolved = resolveImageOptimizerOptions(options);

  return definePlugin({
    name: PLUGIN_NAME,
    order: 50,
    provides: ["image-transforms"],
    cacheVersion: "image-optimizer-v1",
    options,
    transformAssets: async ({ assets, readAsset, logger }) => {
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
        for (const width of resolved.widths) {
          if (width >= metadata.width) continue;
          for (const format of resolved.formats) {
            const output = image
              .clone()
              .resize({ width, withoutEnlargement: true });
            if (resolved.keepMetadata) output.withMetadata();
            const content =
              format === "avif"
                ? await output.avif({ quality: resolved.quality }).toBuffer()
                : await output.webp({ quality: resolved.quality }).toBuffer();
            outputs.push({
              sourcePath: asset.path,
              path: variantPath(asset.path, width, format),
              content,
              mimeType: `image/${format}`,
              width,
              height: Math.round(
                (metadata.height ?? 0) * (width / metadata.width),
              ),
            });
          }
        }
      }
      return outputs;
    },
  });
}

export const imageOptimizerPlugin = imageOptimizer;

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
