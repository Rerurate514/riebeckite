import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Logger, Tracer } from "../observability.js";
import type { JsonValue } from "../types/json_value.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";

export type { JsonValue } from "../types/json_value.js";

export type PluginCache = {
  get<T extends JsonValue>(key: string): Promise<T | undefined>;
  set<T extends JsonValue>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

export function createUnavailablePluginCache(): PluginCache {
  return {
    get: unavailableAtRuntime,
    set: unavailableAtRuntime,
    delete: unavailableAtRuntime,
    clear: unavailableAtRuntime,
  };
}

type CreatePluginCacheOptions = {
  pluginName: string;
  cacheVersion?: string;
  cacheDirectory: string;
  logger?: Logger;
  tracer?: Tracer;
};

export function createPluginCache(
  options: CreatePluginCacheOptions,
): PluginCache {
  const pluginDirectory = path.join(
    options.cacheDirectory,
    pluginNamespace(options.pluginName),
  );
  const versionDirectory = path.join(
    pluginDirectory,
    hash(options.cacheVersion ?? "1"),
  );
  const writes = new Map<string, Promise<void>>();

  return {
    async get<T extends JsonValue>(key: string): Promise<T | undefined> {
      let raw: string;
      try {
        raw = await fs.readFile(cachePath(versionDirectory, key), "utf8");
      } catch (error) {
        if (isNotFoundError(error)) {
          options.tracer?.event("cache.miss", { plugin: options.pluginName });
          return undefined;
        }
        throw error;
      }

      try {
        const value = JSON.parse(raw) as T;
        options.tracer?.event("cache.hit", { plugin: options.pluginName });
        return value;
      } catch {
        options.logger?.warn(
          "Plugin cache entry is corrupted and will be ignored.",
          {
            plugin: options.pluginName,
          },
        );
        return undefined;
      }
    },

    async set<T extends JsonValue>(key: string, value: T): Promise<void> {
      const targetPath = cachePath(versionDirectory, key);
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new TypeError("Plugin cache values must be JSON serializable.");
      }

      const previousWrite = writes.get(targetPath) ?? Promise.resolve();
      const write = previousWrite
        .catch(() => undefined)
        .then(() => writeAtomically(targetPath, versionDirectory, serialized));
      writes.set(targetPath, write);

      try {
        await write;
      } finally {
        if (writes.get(targetPath) === write) {
          writes.delete(targetPath);
        }
      }
    },

    async delete(key: string): Promise<void> {
      await fs.rm(cachePath(versionDirectory, key), { force: true });
    },

    async clear(): Promise<void> {
      await fs.rm(pluginDirectory, { recursive: true, force: true });
    },
  };
}

async function writeAtomically(
  targetPath: string,
  versionDirectory: string,
  serialized: string,
): Promise<void> {
  await fs.mkdir(versionDirectory, { recursive: true });
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;

  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    await fs.rename(temporaryPath, targetPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function resolvePluginCacheDirectory(
  config: ResolvedRiebeckiteConfig | undefined,
): string {
  if (!config) return path.resolve(process.cwd(), ".riebeckite", "cache");
  if (config.cache?.directory) return config.cache.directory;
  if (config.buildDirectory) return path.join(config.buildDirectory, "cache");
  return path.resolve(config.content.directory, "..", ".riebeckite", "cache");
}

function cachePath(versionDirectory: string, key: string): string {
  return path.join(versionDirectory, `${hash(key)}.json`);
}

function pluginNamespace(pluginName: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(pluginName)
    ? pluginName
    : hash(pluginName);
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function unavailableAtRuntime(): Promise<never> {
  throw new Error(
    "Plugin cache is available only through an explicit build context.",
  );
}
