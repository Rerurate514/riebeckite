import { queryContentEntries } from "../content/content_query.js";
import type { PluginCache } from "../plugin/plugin_cache.js";
import {
  fingerprintQueryEntries,
  isCacheEntry,
} from "./derived_view_serialize.js";
import type {
  CacheEntry,
  DerivedDependency,
  DerivedView,
  DerivedViewRegistryOptions,
} from "./derived_view_types.js";

export async function readCache(
  cache: PluginCache | undefined,
  key: string,
  view: DerivedView<unknown, unknown>,
  input: string,
  isCurrent: (dependency: DerivedDependency) => boolean,
): Promise<CacheEntry | undefined> {
  try {
    const entry = await cache?.get(key);
    if (!isCacheEntry(entry, view, input)) return undefined;
    if (!entry.dependencies.every(isCurrent)) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

export async function writeCache(
  cache: PluginCache | undefined,
  key: string,
  entry: CacheEntry,
): Promise<void> {
  try {
    await cache?.set(key, entry);
  } catch {
    return;
  }
}

export function isCurrentDependency(
  dependency: DerivedDependency,
  views: Map<string, DerivedView<unknown, unknown>>,
  options: DerivedViewRegistryOptions,
): boolean {
  if (!dependency.fingerprint) return false;
  if (dependency.type === "unknown") return false;
  if (dependency.type === "view") {
    return views.get(dependency.id)?.version === dependency.fingerprint;
  }
  if (dependency.type === "query") {
    if (!dependency.query || !options.queryEntries) return false;
    try {
      const entries = options.queryEntries(
        dependency.query.pool ?? "discoverable",
      );
      return (
        fingerprintQueryEntries(
          queryContentEntries(entries, dependency.query),
        ) === dependency.fingerprint
      );
    } catch {
      return false;
    }
  }
  const current = options.dependencyFingerprint?.({
    type: dependency.type,
    id: dependency.id,
    property: dependency.property,
  });
  return current === dependency.fingerprint;
}
