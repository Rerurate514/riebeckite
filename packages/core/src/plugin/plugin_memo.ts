import { createHash } from "node:crypto";
import type { Logger } from "../observability.js";
import type { JsonValue, PluginCache } from "./plugin_cache.js";

/**
 * Dependency-aware memoization on top of the existing `PluginCache`. The cache
 * key is derived from the caller-supplied key plus a stable hash of the
 * declared dependencies, so a cache hit only happens when everything the value
 * depends on is unchanged. No separate cache backend is introduced.
 */
export type PluginMemo = {
  memo<T extends JsonValue>(
    key: string,
    dependencies: JsonValue,
    compute: () => T | Promise<T>,
  ): Promise<T>;
};

export type CreatePluginMemoOptions = {
  logger?: Logger;
};

export function createPluginMemo(
  cache: PluginCache,
  options: CreatePluginMemoOptions = {},
): PluginMemo {
  return {
    async memo<T extends JsonValue>(
      key: string,
      dependencies: JsonValue,
      compute: () => T | Promise<T>,
    ): Promise<T> {
      const memoKey = `${key}:${hash(stableStringify(dependencies))}`;

      try {
        const cached = await cache.get<T>(memoKey);
        if (cached !== undefined) return cached;
      } catch (error) {
        warn(
          options.logger,
          "Plugin cache read failed; recomputing.",
          key,
          error,
        );
      }

      const value = await compute();

      try {
        await cache.set(memoKey, value);
      } catch (error) {
        warn(
          options.logger,
          "Plugin cache write failed; result not cached.",
          key,
          error,
        );
      }

      return value;
    },
  };
}

/**
 * Serializes JSON values with sorted object keys so that logically identical
 * dependency sets hash identically regardless of key insertion order.
 */
export function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const keys = Object.keys(value).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",");
  return `{${body}}`;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function warn(
  logger: Logger | undefined,
  message: string,
  key: string,
  error: unknown,
): void {
  logger?.warn(message, {
    memoKey: key,
    error: error instanceof Error ? error.message : String(error),
  });
}
