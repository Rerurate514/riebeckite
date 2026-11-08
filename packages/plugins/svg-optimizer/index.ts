import { createHash } from "node:crypto";
import type {
  AssetTransformInput,
  AssetTransformOutput,
  PluginAssetTransformContext,
} from "@riebeckite/core";
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

type SvgOptimizerStats = {
  inputs: number;
  optimized: number;
  noReduction: number;
  cacheHits: number;
  cacheMisses: number;
  savedBytes: number;
  skipped: { path: string; reason: string }[];
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
  let stats: SvgOptimizerStats = emptyStats();

  return definePlugin({
    name: PLUGIN_NAME,
    order: 60,
    cacheVersion: JSON.stringify({
      version: "svg-optimizer-v1",
      options: resolved,
      svgo: SVGO_VERSION,
    }),
    options,
    transformAssets: async (context) => {
      stats = emptyStats();
      if (resolved.keepOriginal) return [];
      const outputs = [];
      for (const asset of context.assets) {
        if (extensionOf(asset.path) !== "svg") continue;
        const output = await optimizeSvgAsset(asset, context, config, stats);
        if (output) outputs.push(output);
      }
      return outputs;
    },
    inspector: {
      apiVersion: 1,
      tabs: [
        {
          id: "svg-optimizer",
          title: { en: "SVG optimization", ja: "SVG 最適化" },
          description: {
            en: "Optimization results, cache use, and skipped assets.",
            ja: "最適化結果、キャッシュ利用、スキップしたアセットを表示します。",
          },
          order: 23,
          collect: () => collectInspectorItems(resolved, stats),
        },
      ],
    },
  });
}

async function optimizeSvgAsset(
  asset: AssetTransformInput,
  context: PluginAssetTransformContext,
  config: SvgoConfig,
  stats: SvgOptimizerStats,
): Promise<AssetTransformOutput | undefined> {
  stats.inputs += 1;
  const input = await readSvgInput(asset, context, stats);
  if (!input) return undefined;
  const cacheKey = assetCacheKey(asset.path, input);
  const cached = await context.cache.get<CachedSvgTransform>(cacheKey);
  if (isCachedSvgTransform(cached))
    return applyCachedSvg(cached, asset, input, context, stats);
  stats.cacheMisses += 1;
  const source = decode(input);
  if (source === null)
    return skipSvgAsset(
      stats,
      context,
      cacheKey,
      asset.path,
      "invalid UTF-8",
      `Skipped SVG asset that is not valid UTF-8: ${asset.path}`,
    );
  const unsafe = unsafeReason(source);
  if (unsafe)
    return skipSvgAsset(
      stats,
      context,
      cacheKey,
      asset.path,
      unsafe,
      `Skipped SVG asset containing ${unsafe}: ${asset.path}. Optimization is not sanitization.`,
    );
  let optimized: string;
  try {
    optimized = optimize(source, config).data;
  } catch {
    return skipSvgAsset(
      stats,
      context,
      cacheKey,
      asset.path,
      "optimize failed",
      `Skipped SVG asset that could not be optimized: ${asset.path}`,
    );
  }
  const content = Buffer.from(optimized, "utf8");
  if (content.byteLength >= input.byteLength) {
    stats.noReduction += 1;
    context.tracer.event("svg-transform.no-reduction", { path: asset.path });
    await context.cache.set(cacheKey, { content: null });
    return undefined;
  }
  await context.cache.set(cacheKey, { content: content.toString("base64") });
  context.tracer.event("svg-transform.run", { path: asset.path });
  stats.optimized += 1;
  stats.savedBytes += input.byteLength - content.byteLength;
  return {
    sourcePath: asset.path,
    path: asset.path,
    content,
    mimeType: MIME_TYPE,
  };
}

async function readSvgInput(
  asset: AssetTransformInput,
  context: PluginAssetTransformContext,
  stats: SvgOptimizerStats,
): Promise<Uint8Array | undefined> {
  if (asset.size !== undefined && asset.size > DEFAULT_MAX_INPUT_BYTES) {
    stats.skipped.push({ path: asset.path, reason: "oversized" });
    context.logger.warn(`Skipped oversized SVG asset: ${asset.path}`);
    return undefined;
  }
  const input = await context.readAsset(asset.path);
  if (!input || input.byteLength > DEFAULT_MAX_INPUT_BYTES) {
    stats.skipped.push({ path: asset.path, reason: "unreadable" });
    context.logger.warn(
      `Skipped oversized or unreadable SVG asset: ${asset.path}`,
    );
    return undefined;
  }
  return input;
}

function applyCachedSvg(
  cached: CachedSvgTransform,
  asset: AssetTransformInput,
  input: Uint8Array,
  context: PluginAssetTransformContext,
  stats: SvgOptimizerStats,
): AssetTransformOutput | undefined {
  stats.cacheHits += 1;
  context.tracer.event("svg-transform.cache-hit", { path: asset.path });
  if (cached.content === null) {
    stats.noReduction += 1;
    return undefined;
  }
  const output = outputFor(asset.path, cached.content);
  stats.optimized += 1;
  stats.savedBytes += input.byteLength - output.content.byteLength;
  return output;
}

async function skipSvgAsset(
  stats: SvgOptimizerStats,
  context: PluginAssetTransformContext,
  cacheKey: string,
  path: string,
  reason: string,
  message: string,
): Promise<undefined> {
  stats.skipped.push({ path, reason });
  context.logger.warn(message);
  await context.cache.set(cacheKey, { content: null });
  return undefined;
}

function collectInspectorItems(
  resolved: ResolvedSvgOptimizerOptions,
  stats: SvgOptimizerStats,
) {
  if (resolved.keepOriginal)
    return {
      kind: "key-value" as const,
      items: [
        {
          key: { en: "Status", ja: "状態" },
          value: "disabled (keepOriginal)",
        },
      ],
    };
  return {
    kind: "key-value" as const,
    items: [
      { key: { en: "Inputs", ja: "入力" }, value: stats.inputs },
      {
        key: { en: "Optimized", ja: "最適化" },
        value: stats.optimized,
      },
      {
        key: { en: "No reduction", ja: "削減なし" },
        value: stats.noReduction,
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
        key: { en: "Saved", ja: "削減量" },
        value: formatBytes(stats.savedBytes),
      },
      {
        key: { en: "Skipped", ja: "スキップ" },
        value: stats.skipped.length,
      },
      ...(stats.skipped.length > 0
        ? [
            {
              key: {
                en: "Skipped assets",
                ja: "スキップしたアセット",
              },
              value: stats.skipped
                .slice(0, 20)
                .map((skipped) => `${skipped.path} (${skipped.reason})`)
                .join("; "),
            },
          ]
        : []),
    ],
  };
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

function emptyStats(): SvgOptimizerStats {
  return {
    inputs: 0,
    optimized: 0,
    noReduction: 0,
    cacheHits: 0,
    cacheMisses: 0,
    savedBytes: 0,
    skipped: [],
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
