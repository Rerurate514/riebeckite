import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { Logger, Tracer } from "../observability.js";
import { stableStringify } from "../plugin/plugin_memo.js";
import type { JsonValue } from "../types/json_value.js";
import type { PostContent } from "../types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";

export type PersistentContentCacheEntry = {
  schemaVersion: number;
  key: string;
  dependencies: readonly CachedContentDependency[];
  value: {
    frontmatter: PostContent["frontmatter"];
    html: string;
  };
};

export type PersistentContentCacheOptions = {
  config: ResolvedRiebeckiteConfig;
  logger?: Logger;
  tracer?: Tracer;
};

const CONTENT_CACHE_NAMESPACE = "content";
export const CONTENT_CACHE_SCHEMA_VERSION = 3;
export const CONTENT_CACHE_COMPATIBILITY_VERSION = 1;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function cacheDirectory(config: ResolvedRiebeckiteConfig): string {
  if (config.cache?.directory) {
    return path.join(config.cache.directory, CONTENT_CACHE_NAMESPACE);
  }
  // Fallback to plugin cache directory resolution
  if (config.buildDirectory) {
    return path.join(config.buildDirectory, "cache", CONTENT_CACHE_NAMESPACE);
  }
  // Fallback to temp directory for tests without explicit cache directory
  return path.join(
    os.tmpdir(),
    "riebeckite-content-cache",
    CONTENT_CACHE_NAMESPACE,
  );
}

function versionDirectory(baseDir: string): string {
  return path.join(baseDir, `v${CONTENT_CACHE_SCHEMA_VERSION}`);
}

function cacheFilePath(baseDir: string, key: string): string {
  return path.join(versionDirectory(baseDir), `${hash(key)}.json`);
}

async function writeAtomically(
  targetPath: string,
  dir: string,
  serialized: string,
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const temporaryPath = `${targetPath}.${createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 12)}.tmp`;

  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    await fs.rename(temporaryPath, targetPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export type PersistentContentCache = {
  get(key: string): Promise<PersistentContentCacheEntry | undefined>;
  set(key: string, value: PersistentContentCacheEntry): Promise<void>;
  clear(): Promise<void>;
};

export function createPersistentContentCache(
  options: PersistentContentCacheOptions,
) {
  const { config, logger, tracer } = options;
  const baseDir = cacheDirectory(config);
  const versionDir = versionDirectory(baseDir);

  return {
    async get(key: string): Promise<PersistentContentCacheEntry | undefined> {
      if (!config.cache?.enabled) return undefined;

      const filePath = cacheFilePath(baseDir, key);
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const entry = JSON.parse(raw) as PersistentContentCacheEntry;

        if (entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION) {
          tracer?.event("persistentContentCache.schemaMismatch", { key });
          return undefined;
        }
        if (entry.key !== key) {
          tracer?.event("persistentContentCache.keyMismatch", { key });
          return undefined;
        }
        if (!isValidCacheEntry(entry)) {
          tracer?.event("persistentContentCache.invalidShape", { key });
          return undefined;
        }

        tracer?.event("persistentContentCache.found", { key });
        return entry;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          tracer?.event("persistentContentCache.miss", { key });
          return undefined;
        }
        if (error instanceof SyntaxError) {
          logger?.warn(
            "Persistent content cache entry is corrupted and will be ignored.",
            {
              key,
            },
          );
          return undefined;
        }
        throw error;
      }
    },

    async set(key: string, value: PersistentContentCacheEntry): Promise<void> {
      if (!config.cache?.enabled) return;

      const filePath = cacheFilePath(baseDir, key);
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new TypeError(
          "Persistent content cache values must be JSON serializable.",
        );
      }

      await writeAtomically(filePath, versionDir, serialized);
      tracer?.event("persistentContentCache.write", { key });
    },

    async clear(): Promise<void> {
      try {
        await fs.rm(baseDir, { recursive: true, force: true });
      } catch {
        // Ignore errors on clear
      }
    },
  };
}

function isValidCacheEntry(
  entry: PersistentContentCacheEntry,
): entry is PersistentContentCacheEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.key === "string" &&
    typeof entry.schemaVersion === "number" &&
    Array.isArray(entry.dependencies) &&
    entry.dependencies.every(isValidDependency) &&
    typeof entry.value === "object" &&
    entry.value !== null &&
    typeof entry.value.html === "string" &&
    typeof entry.value.frontmatter === "object" &&
    entry.value.frontmatter !== null &&
    !Array.isArray(entry.value.frontmatter)
  );
}

function isValidDependency(value: unknown): value is CachedContentDependency {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CachedContentDependency>;
  return (
    (candidate.kind === "content" ||
      candidate.kind === "file" ||
      candidate.kind === "link") &&
    typeof candidate.id === "string" &&
    typeof candidate.fingerprint === "string"
  );
}

export type CacheKeyInputs = {
  slug: string;
  source: string;
  frontmatter: PostContent["frontmatter"];
  pipelineFingerprint: string;
};

export function computeContentCacheKey(inputs: CacheKeyInputs): string {
  const { slug, source, frontmatter, pipelineFingerprint } = inputs;

  // Normalize frontmatter: convert Dates to ISO strings for stable serialization
  const normalizedFrontmatter = normalizeFrontmatterForCache(frontmatter);

  const keyData = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    slug,
    source,
    frontmatter: normalizedFrontmatter as JsonValue,
    pipelineFingerprint,
  };

  return hash(stableStringify(keyData as JsonValue));
}

function normalizeFrontmatterForCache(
  frontmatter: PostContent["frontmatter"],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      // For nested objects, recursively normalize (though frontmatter is typically flat)
      normalized[key] = normalizeFrontmatterForCache(
        value as PostContent["frontmatter"],
      );
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

export function computePipelineFingerprint(
  config: ResolvedRiebeckiteConfig,
): string {
  const plugins = config.plugins;

  const fingerprintData = {
    compatibilityVersion: CONTENT_CACHE_COMPATIBILITY_VERSION,
    plugins: plugins.map((p) => pluginFingerprint(p)),
    markdown: config.markdown as JsonValue,
    content: {
      filters: config.content.filters,
    } as JsonValue,
  };

  return hash(stableStringify(fingerprintData as JsonValue));
}

const pluginFingerprints = new WeakMap<object, JsonValue>();

function pluginFingerprint(
  plugin: ResolvedRiebeckiteConfig["plugins"][number],
): JsonValue {
  const cached = pluginFingerprints.get(plugin);
  if (cached !== undefined) return cached;
  const fingerprint = sanitizeForFingerprint(plugin) as JsonValue;
  pluginFingerprints.set(plugin, fingerprint);
  return fingerprint;
}

const functionSourceFingerprints = new Map<string, string>();

function fingerprintFunctionSource(value: (...args: never[]) => unknown) {
  const source = Function.prototype.toString.call(value);
  const cached = functionSourceFingerprints.get(source);
  if (cached !== undefined) return cached;
  const fingerprint = `fn:${hash(source)}`;
  functionSourceFingerprints.set(source, fingerprint);
  return fingerprint;
}

function sanitizeForFingerprint(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "function") {
    return fingerprintFunctionSource(value as (...args: never[]) => unknown);
  }
  if (typeof value === "symbol") return "[Symbol]";
  if (Array.isArray(value)) return value.map(sanitizeForFingerprint);
  if (value instanceof Map || value instanceof Set)
    return `[${value.constructor.name}]`;
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeForFingerprint(val);
    }
    return result;
  }
  return value;
}

export function isPersistentlyCacheable(
  _slug: string,
  config: ResolvedRiebeckiteConfig,
): { cacheable: boolean; reason?: string } {
  // Phase 1: l10n enabled -> bypass persistent cache (uses global content metadata)
  const hasL10n = config.plugins.some(
    (p) => p.name === "l10n" && p.enabled !== false,
  );
  if (hasL10n) {
    return { cacheable: false, reason: "l10n plugin is enabled" };
  }

  const unsafePlugin = config.plugins.find((plugin) => {
    if (plugin.enabled === false) return false;
    if (!canAffectProcessedContent(plugin)) return false;
    return (
      plugin.processedContentCache?.dependencyMode !== "none" &&
      plugin.processedContentCache?.dependencyMode !== "tracked"
    );
  });

  if (unsafePlugin) {
    if (unsafePlugin.processedContentCache?.dependencyMode === "unsafe") {
      return {
        cacheable: false,
        reason: `plugin ${unsafePlugin.name} explicitly marks processed content cache as unsafe`,
      };
    }

    return {
      cacheable: false,
      reason: `plugin ${unsafePlugin.name} can affect processed content without a processedContentCache contract`,
    };
  }

  return { cacheable: true };
}

function canAffectProcessedContent(
  plugin: ResolvedRiebeckiteConfig["plugins"][number],
): boolean {
  return Boolean(
    plugin.remarkPlugins?.length ||
      plugin.rehypePlugins?.length ||
      plugin.extendMarkdownPipeline ||
      plugin.extendHtmlPipeline ||
      plugin.renderers?.length ||
      plugin.onContentLoaded ||
      plugin.onPostParsed ||
      plugin.onPostProcessed,
  );
}

export function extractFrontmatter(
  markdown: string,
): PostContent["frontmatter"] {
  const vfile = new VFile({ value: markdown });
  matter(vfile);
  return (vfile.data.matter ?? {}) as PostContent["frontmatter"];
}
