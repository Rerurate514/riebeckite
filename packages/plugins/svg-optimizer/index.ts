import { createHash } from "node:crypto";
import { definePlugin } from "@riebeckite/core";
import type { PluginConfig, Config as SvgoConfig } from "svgo/browser";
import { optimize, VERSION as SVGO_VERSION } from "svgo/browser";

export type SvgOptimizerOptions = {
  multipass?: boolean;
  preserveViewBox?: boolean;
  preserveAccessibility?: boolean;
  keepOriginal?: boolean;
};

export type ResolvedSvgOptimizerOptions = Required<SvgOptimizerOptions>;

const PLUGIN_NAME = "svg-optimizer";
const MIME_TYPE = "image/svg+xml";
const DEFAULT_MAX_INPUT_BYTES = 10 * 1024 * 1024;

type CachedSvgTransform = {
  readonly content: string | null;
};

export function resolveSvgOptimizerOptions(
  options: SvgOptimizerOptions = {},
): ResolvedSvgOptimizerOptions {
  return {
    multipass: options.multipass ?? true,
    preserveViewBox: options.preserveViewBox ?? true,
    preserveAccessibility: options.preserveAccessibility ?? true,
    keepOriginal: options.keepOriginal ?? false,
  };
}

export function svgOptimizer(options: SvgOptimizerOptions = {}) {
  const resolved = resolveSvgOptimizerOptions(options);
  const config = svgoConfig(resolved);

  return definePlugin({
    name: PLUGIN_NAME,
    order: 60,
    cacheVersion: JSON.stringify({
      version: "svg-optimizer-v1",
      options: resolved,
      svgo: SVGO_VERSION,
    }),
    options,
    transformAssets: async ({ assets, readAsset, cache, logger, tracer }) => {
      if (resolved.keepOriginal) return [];
      const outputs = [];
      for (const asset of assets) {
        if (extensionOf(asset.path) !== "svg") continue;
        if (asset.size !== undefined && asset.size > DEFAULT_MAX_INPUT_BYTES) {
          logger.warn(`Skipped oversized SVG asset: ${asset.path}`);
          continue;
        }
        const input = await readAsset(asset.path);
        if (!input || input.byteLength > DEFAULT_MAX_INPUT_BYTES) {
          logger.warn(
            `Skipped oversized or unreadable SVG asset: ${asset.path}`,
          );
          continue;
        }
        const cacheKey = assetCacheKey(asset.path, input);
        const cached = await cache.get<CachedSvgTransform>(cacheKey);
        if (isCachedSvgTransform(cached)) {
          tracer.event("svg-transform.cache-hit", { path: asset.path });
          if (cached.content !== null) {
            outputs.push(outputFor(asset.path, cached.content));
          }
          continue;
        }
        const source = decode(input);
        if (source === null) {
          logger.warn(
            `Skipped SVG asset that is not valid UTF-8: ${asset.path}`,
          );
          await cache.set(cacheKey, { content: null });
          continue;
        }
        const unsafe = unsafeReason(source);
        if (unsafe) {
          logger.warn(
            `Skipped SVG asset containing ${unsafe}: ${asset.path}. Optimization is not sanitization.`,
          );
          await cache.set(cacheKey, { content: null });
          continue;
        }
        let optimized: string;
        try {
          optimized = optimize(source, config).data;
        } catch {
          logger.warn(
            `Skipped SVG asset that could not be optimized: ${asset.path}`,
          );
          await cache.set(cacheKey, { content: null });
          continue;
        }
        const content = Buffer.from(optimized, "utf8");
        if (content.byteLength >= input.byteLength) {
          tracer.event("svg-transform.no-reduction", { path: asset.path });
          await cache.set(cacheKey, { content: null });
          continue;
        }
        await cache.set(cacheKey, {
          content: content.toString("base64"),
        });
        tracer.event("svg-transform.run", { path: asset.path });
        outputs.push({
          sourcePath: asset.path,
          path: asset.path,
          content,
          mimeType: MIME_TYPE,
        });
      }
      return outputs;
    },
  });
}

function svgoConfig(options: ResolvedSvgOptimizerOptions): SvgoConfig {
  const overrides: {
    cleanupIds?: false;
    removeHiddenElems?: false;
    removeUselessDefs?: false;
    removeDesc?: false | { removeAny: true };
  } = {
    cleanupIds: false,
    removeHiddenElems: false,
    removeUselessDefs: false,
    removeDesc: options.preserveAccessibility ? false : { removeAny: true },
  };
  const plugins: PluginConfig[] = [
    { name: "preset-default", params: { overrides } },
  ];
  if (!options.preserveViewBox) plugins.push({ name: "removeViewBox" });
  if (!options.preserveAccessibility) plugins.push({ name: "removeTitle" });
  return { multipass: options.multipass, plugins };
}

function extensionOf(path: string): string {
  return path.slice(path.lastIndexOf(".") + 1).toLowerCase();
}

function decode(input: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return null;
  }
}

function unsafeReason(source: string): string | null {
  if (/<(script|foreignObject|iframe|object|embed|audio|video)\b/i.test(source))
    return "active or embedded content";
  if (/\son[a-z]+\s*=/i.test(source)) return "an inline event handler";
  if (/(?:javascript|vbscript)\s*:/i.test(source))
    return "a dangerous URI scheme";
  if (/<!ENTITY|<!DOCTYPE[^>]*\bSYSTEM\b/i.test(source))
    return "an external entity declaration";
  if (/@import/i.test(source)) return "a CSS import";
  if (/expression\s*\(/i.test(source)) return "a CSS expression";
  const reference =
    /\b(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of source.matchAll(reference)) {
    const value = normalizeReference(match[1] ?? match[2] ?? match[3] ?? "");
    if (value.startsWith("#")) continue;
    if (/^data:image\/(?:png|jpe?g|gif|webp);/.test(value)) continue;
    return "an external resource reference";
  }
  const cssUrl = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  for (const match of source.matchAll(cssUrl)) {
    const value = normalizeReference(match[1] ?? match[2] ?? match[3] ?? "");
    if (value.startsWith("#")) continue;
    return "an external CSS resource";
  }
  return null;
}

function normalizeReference(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (raw, code: string) => {
      const point =
        code[0]?.toLowerCase() === "x"
          ? Number.parseInt(code.slice(1), 16)
          : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : raw;
    })
    .replace(/&colon;/gi, ":")
    .replace(/&sol;/gi, "/");
}

function assetCacheKey(path: string, input: Uint8Array): string {
  return createHash("sha256").update(path).update(input).digest("hex");
}

function isCachedSvgTransform(
  value: CachedSvgTransform | undefined,
): value is CachedSvgTransform {
  return (
    typeof value === "object" &&
    value !== null &&
    (value.content === null || typeof value.content === "string")
  );
}

function outputFor(sourcePath: string, content: string) {
  return {
    sourcePath,
    path: sourcePath,
    content: Buffer.from(content, "base64"),
    mimeType: MIME_TYPE,
  };
}
