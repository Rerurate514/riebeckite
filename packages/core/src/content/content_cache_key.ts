import { computeMarkdownSanitizeFingerprint } from "../markdown_sanitize_schema.js";
import { stableStringify } from "../plugin/plugin_memo.js";
import type { ContentPublicLocation } from "../types/content_manifest.js";
import type { JsonValue } from "../types/json_value.js";
import { toJsonValue } from "../types/json_value.js";
import type { PostContent } from "../types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  CONTENT_CACHE_COMPATIBILITY_VERSION,
  CONTENT_CACHE_SCHEMA_VERSION,
  hash,
} from "./content_cache_io.js";
import type { CacheKeyInputs } from "./content_cache_types.js";

export function computeContentCacheKey(inputs: CacheKeyInputs): string {
  const { slug, source, frontmatter, pipelineFingerprint } = inputs;

  // Normalize frontmatter: convert Dates to ISO strings for stable serialization
  const normalizedFrontmatter = normalizeFrontmatterForCache(frontmatter);

  const keyData = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    slug,
    source,
    frontmatter: normalizedFrontmatter,
    pipelineFingerprint,
  };

  return hash(stableStringify(keyData));
}

export function normalizeFrontmatterForCache(
  frontmatter: PostContent["frontmatter"],
): Record<string, JsonValue | undefined> {
  const normalized: Record<string, JsonValue | undefined> = {};

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
      normalized[key] = toJsonValue(value);
    }
  }

  return normalized;
}

export function computePipelineFingerprint(
  config: ResolvedRiebeckiteConfig,
  contentScopeFingerprint?: string,
  sanitizeFingerprint: string = computeMarkdownSanitizeFingerprint(),
): string {
  const plugins = config.plugins;

  const fingerprintData = {
    compatibilityVersion: CONTENT_CACHE_COMPATIBILITY_VERSION,
    sanitize: sanitizeFingerprint,
    plugins: plugins.map((p) => pluginFingerprint(p)),
    content: {
      filters: config.content.filters,
    },
    contentScopeFingerprint,
  };

  return hash(stableStringify(fingerprintData));
}

export function computeContentScopeFingerprint(
  locations: ReadonlyMap<string, ContentPublicLocation>,
): string {
  return hash(
    stableStringify(
      [...locations.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slug, location]) => ({
          slug,
          permalink: location.permalink,
          ...(location.language ? { language: location.language } : {}),
          ...(location.redirects
            ? {
                redirects: location.redirects.map((redirect) => ({
                  ...redirect,
                })),
              }
            : {}),
          ...(location.metadata ? { metadata: { ...location.metadata } } : {}),
        })),
    ),
  );
}

export const pluginFingerprints = new WeakMap<object, JsonValue>();

export function pluginFingerprint(
  plugin: ResolvedRiebeckiteConfig["plugins"][number],
): JsonValue {
  const cached = pluginFingerprints.get(plugin);
  if (cached !== undefined) return cached;
  const fingerprint = sanitizeForFingerprint(plugin);
  if (fingerprint === undefined) {
    throw new TypeError("Plugin fingerprint must be JSON serializable.");
  }
  pluginFingerprints.set(plugin, fingerprint);
  return fingerprint;
}

export function sanitizeForFingerprint(value: unknown): JsonValue | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return "[Symbol]";
  if (typeof value === "bigint") {
    throw new TypeError("BigInt values are not JSON serializable.");
  }
  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      items.push(sanitizeForFingerprint(item) ?? null);
    }
    return items;
  }
  if (value instanceof Map || value instanceof Set) {
    return `[${value.constructor.name}]`;
  }
  if (typeof value === "object") {
    const result: { [key: string]: JsonValue | undefined } = {};
    for (const [key, val] of Object.entries(value)) {
      const converted = sanitizeForFingerprint(val);
      if (converted !== undefined) result[key] = converted;
    }
    return result;
  }
  return undefined;
}
