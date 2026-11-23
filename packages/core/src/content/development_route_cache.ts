import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PluginRuntime } from "../plugin/plugin_runtime.js";
import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import { type JsonValue, toJsonValue } from "../types/json_value.js";
import { mapConcurrent } from "../utils/concurrency.js";
import { CONTENT_PROCESSING_CONCURRENCY } from "./content_manager_shared.js";
import type { ContentSourceEntry } from "./content_source.js";
import { ManifestBuilder } from "./manifest_builder.js";

const VERSION = 2;
const MAX_BYTES = 64 * 1024 * 1024;

type State = {
  version: number;
  pipelineFingerprint: string;
  entries: Record<string, string>;
  contentIndex: readonly [string, string][];
  contentIndexAmbiguities: readonly [string, readonly string[]][];
  locations: readonly [string, ContentPublicLocation][];
  inputs: readonly [string, ContentLocationInput][];
  manifest: JsonValue;
  plugins: ReturnType<PluginRuntime["getDevelopmentRouteCacheSnapshots"]>;
};

export function resolveDevelopmentRouteCachePath(
  buildStatePath: string,
): string {
  return path.join(
    path.dirname(buildStatePath),
    "development-route-state.json",
  );
}

export async function loadDevelopmentRouteCache(
  statePath: string,
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<string>,
  pipelineFingerprint: string,
  pluginRuntime: PluginRuntime,
): Promise<
  | {
      manifest: ContentManifest;
      contentIndex: Map<string, string>;
      ambiguities: Map<string, readonly string[]>;
      locations: Map<string, ContentPublicLocation>;
      inputs: Map<string, ContentLocationInput>;
    }
  | undefined
> {
  const snapshots = pluginRuntime.getDevelopmentRouteCacheSnapshots();
  const state = await readState(statePath);
  try {
    if (
      !state ||
      state.pipelineFingerprint !== pipelineFingerprint ||
      !sameSnapshots(snapshots, state.plugins) ||
      !(await sameEntries(entries, read, state.entries))
    ) {
      return undefined;
    }
    const contentIndex = new Map(state.contentIndex);
    const ambiguities = new Map(state.contentIndexAmbiguities);
    const restored = deserializeManifest(
      state.manifest,
      contentIndex,
      ambiguities,
    );
    if (!restored) return undefined;
    await pluginRuntime.startBuild(new Map(state.contentIndex));
    if (
      !(await pluginRuntime.restoreDevelopmentRouteCache(state.plugins ?? []))
    )
      return undefined;
    return {
      manifest: restored,
      contentIndex,
      ambiguities,
      locations: new Map(state.locations),
      inputs: new Map(state.inputs),
    };
  } catch {
    return undefined;
  }
}

export async function saveDevelopmentRouteCache(
  statePath: string,
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<string>,
  pipelineFingerprint: string,
  pluginRuntime: PluginRuntime,
  manifest: ContentManifest,
  locations: ReadonlyMap<string, ContentPublicLocation>,
  inputs: ReadonlyMap<string, ContentLocationInput>,
): Promise<void> {
  const plugins = pluginRuntime.getDevelopmentRouteCacheSnapshots();
  const serialized = serializeManifest(manifest);
  if (!plugins || !serialized) return;
  const fingerprints = Object.fromEntries(
    await mapConcurrent(
      entries,
      CONTENT_PROCESSING_CONCURRENCY,
      async (entry) => [entry.path, await fingerprint(entry, read)] as const,
    ),
  );
  const state: State = {
    version: VERSION,
    pipelineFingerprint,
    entries: fingerprints,
    contentIndex: [...manifest.contentIndex],
    contentIndexAmbiguities: [...(manifest.contentIndexAmbiguities ?? [])],
    locations: [...locations],
    inputs: [...inputs],
    manifest: serialized,
    plugins,
  };
  const temporaryPath = `${statePath}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(state), "utf8");
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function readState(statePath: string): Promise<State | undefined> {
  try {
    if ((await fs.stat(statePath)).size > MAX_BYTES) return undefined;
    const state: unknown = JSON.parse(await fs.readFile(statePath, "utf8"));
    return isState(state) ? state : undefined;
  } catch {
    return undefined;
  }
}

function isState(value: unknown): value is State {
  if (!isRecord(value) || value.version !== VERSION) return false;
  return (
    typeof value.pipelineFingerprint === "string" &&
    isRecord(value.entries) &&
    Array.isArray(value.contentIndex) &&
    Array.isArray(value.contentIndexAmbiguities) &&
    Array.isArray(value.locations) &&
    Array.isArray(value.inputs) &&
    Array.isArray(value.plugins)
  );
}

async function sameEntries(
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<string>,
  fingerprints: Record<string, string>,
): Promise<boolean> {
  if (entries.length !== Object.keys(fingerprints).length) return false;
  return (
    await mapConcurrent(
      entries,
      CONTENT_PROCESSING_CONCURRENCY,
      async (entry) =>
        fingerprints[entry.path] === (await fingerprint(entry, read)),
    )
  ).every(Boolean);
}

async function fingerprint(
  entry: ContentSourceEntry,
  read: (entry: ContentSourceEntry) => Promise<string>,
): Promise<string> {
  const modifiedAt = entry.metadata?.modifiedAt;
  const size = entry.metadata?.size;
  if (
    modifiedAt !== undefined &&
    size !== undefined &&
    Number.isFinite(modifiedAt) &&
    Number.isFinite(size)
  ) {
    return `stat:${modifiedAt}:${size}`;
  }
  return crypto
    .createHash("sha256")
    .update(await read(entry))
    .digest("hex");
}

function serializeManifest(manifest: ContentManifest): JsonValue | undefined {
  return toJsonValue({
    entries: manifest.entries,
    localization: manifest.localization,
    redirects: [...manifest.redirects],
    folderLocations: [...manifest.folderLocations],
    pageRoutes: manifest.pageRoutes,
    pagePaths: manifest.pagePaths,
  });
}

function deserializeManifest(
  value: JsonValue,
  contentIndex: Map<string, string>,
  ambiguities: Map<string, readonly string[]>,
): ContentManifest | undefined {
  if (!isRecord(value) || !Array.isArray(value.entries)) return undefined;
  if (
    !value.entries.every(
      (entry) => isRecord(entry) && typeof entry.slug === "string",
    )
  ) {
    return undefined;
  }
  const entries: ContentManifestEntry[] = value.entries.map((value) => {
    const entry = value as ContentManifestEntry;
    return {
      ...entry,
      ...(entry.file
        ? {
            file: {
              ...entry.file,
              ...(entry.file.ctime
                ? { ctime: new Date(entry.file.ctime) }
                : {}),
              ...(entry.file.mtime
                ? { mtime: new Date(entry.file.mtime) }
                : {}),
            },
          }
        : {}),
    };
  });
  const manifest = new ManifestBuilder().build(
    entries,
    contentIndex,
    ambiguities,
  );
  const redirects = arrayPairs(value.redirects);
  const folderLocations = arrayPairs(value.folderLocations);
  if (!redirects || !folderLocations) return undefined;
  manifest.redirects = new Map(redirects) as ContentManifest["redirects"];
  manifest.folderLocations = new Map(
    folderLocations,
  ) as ContentManifest["folderLocations"];
  if (Array.isArray(value.pageRoutes))
    manifest.pageRoutes = value.pageRoutes as ContentManifest["pageRoutes"];
  if (Array.isArray(value.pagePaths))
    manifest.pagePaths = value.pagePaths as string[];
  if (isRecord(value.localization))
    manifest.localization =
      value.localization as ContentManifest["localization"];
  manifest.publicEntries = manifest.entries.filter(
    (entry) => entry.publishing.routable,
  );
  manifest.discoverableEntries = manifest.entries.filter(
    (entry) => entry.publishing.discoverable,
  );
  manifest.byRoutablePermalink = new Map(
    manifest.publicEntries.map((entry) => [entry.permalink, entry]),
  );
  manifest.publicRedirects = new Map(
    [...manifest.redirects].filter(
      ([, redirect]) => manifest.bySlug.get(redirect.slug)?.publishing.routable,
    ),
  );
  return manifest;
}

function sameSnapshots(
  current: ReturnType<PluginRuntime["getDevelopmentRouteCacheSnapshots"]>,
  saved: State["plugins"],
): boolean {
  return (
    current !== undefined &&
    saved !== undefined &&
    current.length === saved.length &&
    current.every(
      (snapshot, index) =>
        snapshot.name === saved[index]?.name &&
        snapshot.version === saved[index]?.version,
    )
  );
}

function arrayPairs(
  value: JsonValue | undefined,
): readonly [string, unknown][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pairs: [string, unknown][] = [];
  for (const item of value) {
    if (!Array.isArray(item) || typeof item[0] !== "string") return undefined;
    pairs.push([item[0], item[1]]);
  }
  return pairs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
