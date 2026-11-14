import type { Logger, Tracer } from "../observability.js";
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

export type PersistentContentCacheMissReason =
  | "disabled"
  | "no-entry"
  | "corrupted"
  | "unreadable"
  | "schema-mismatch"
  | "key-mismatch"
  | "invalid-entry";

export type PersistentContentCacheLookup =
  | { status: "hit"; entry: PersistentContentCacheEntry }
  | { status: "miss"; reason: PersistentContentCacheMissReason };

export type PersistentContentCache = {
  lookup(key: string): Promise<PersistentContentCacheLookup>;
  get(key: string): Promise<PersistentContentCacheEntry | undefined>;
  set(key: string, value: PersistentContentCacheEntry): Promise<void>;
  clear(): Promise<void>;
};

export type CacheKeyInputs = {
  slug: string;
  source: string;
  frontmatter: PostContent["frontmatter"];
  pipelineFingerprint: string;
};
