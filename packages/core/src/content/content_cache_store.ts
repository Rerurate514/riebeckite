import fs from "node:fs/promises";
import {
  CONTENT_CACHE_SCHEMA_VERSION,
  cacheDirectory,
  cacheFilePath,
  isMissingFileError,
  versionDirectory,
  writeAtomically,
} from "./content_cache_io.js";
import type {
  PersistentContentCache,
  PersistentContentCacheEntry,
  PersistentContentCacheLookup,
  PersistentContentCacheOptions,
} from "./content_cache_types.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";

export function createPersistentContentCache(
  options: PersistentContentCacheOptions,
) {
  const { config, logger, tracer } = options;
  const baseDir = cacheDirectory(config);
  const versionDir = versionDirectory(baseDir);

  const cache: PersistentContentCache = {
    async lookup(key: string): Promise<PersistentContentCacheLookup> {
      if (!config.cache?.enabled) {
        return { status: "miss", reason: "disabled" };
      }

      const filePath = cacheFilePath(baseDir, key);
      let raw: string;
      try {
        raw = await fs.readFile(filePath, "utf8");
      } catch (error) {
        if (isMissingFileError(error)) {
          return { status: "miss", reason: "no-entry" };
        }
        logger?.warn(
          "Persistent content cache entry could not be read and will be ignored.",
          {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return { status: "miss", reason: "unreadable" };
      }

      let entry: PersistentContentCacheEntry;
      try {
        entry = JSON.parse(raw) as PersistentContentCacheEntry;
      } catch (error) {
        logger?.warn(
          "Persistent content cache entry is corrupted and will be ignored.",
          {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return { status: "miss", reason: "corrupted" };
      }

      if (typeof entry !== "object" || entry === null) {
        return { status: "miss", reason: "invalid-entry" };
      }
      if (entry.schemaVersion !== CONTENT_CACHE_SCHEMA_VERSION) {
        return { status: "miss", reason: "schema-mismatch" };
      }
      if (entry.key !== key) {
        return { status: "miss", reason: "key-mismatch" };
      }
      if (!isValidCacheEntry(entry)) {
        return { status: "miss", reason: "invalid-entry" };
      }

      return { status: "hit", entry };
    },

    async get(key: string): Promise<PersistentContentCacheEntry | undefined> {
      const result = await cache.lookup(key);
      return result.status === "hit" ? result.entry : undefined;
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

      try {
        await writeAtomically(filePath, versionDir, serialized);
        tracer?.event("persistentContentCache.write", { key });
      } catch (error) {
        logger?.warn(
          "Persistent content cache entry could not be written and will be ignored.",
          {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    },

    async clear(): Promise<void> {
      try {
        await fs.rm(baseDir, { recursive: true, force: true });
      } catch {
        // Ignore errors on clear
      }
    },
  };

  return cache;
}

export function isValidCacheEntry(
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

export function isValidDependency(
  value: unknown,
): value is CachedContentDependency {
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
