import type { Observability } from "../observability.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import { determineAffectedContent } from "./affected_content.js";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildDependency,
  type ContentBuildState,
  type FingerprintedContentEntry,
} from "./content_build_state.js";
import {
  loadContentBuildState,
  saveContentBuildState,
} from "./content_build_state_store.js";
import {
  allContentChanged,
  type ContentChangeSet,
  diffContentEntries,
} from "./content_change_set.js";
import {
  type CachedContentDependency,
  LINK_LOCATION_PREFIX,
} from "./content_dependency_tracker.js";
import { fingerprintContentEntries } from "./content_fingerprint.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { extractFrontmatterAliases } from "./content_metadata.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputDescriptor } from "./output_dependency.js";

export type ContentBuildPreparation = {
  readonly previousState: ContentBuildState | undefined;
  readonly previousManifestEntriesBySlug: ReadonlyMap<
    string,
    ContentManifestEntry
  >;
  readonly currentEntries: readonly FingerprintedContentEntry[];
  readonly currentContentAliases: ReadonlyMap<string, readonly string[]>;
  readonly currentContentIndex: Map<string, string>;
  readonly currentContentIndexAmbiguities: ReadonlyMap<
    string,
    readonly string[]
  >;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: ReturnType<typeof determineAffectedContent>;
};

type ContentBuildCoordinatorDependencies = {
  readonly buildStatePath: string;
  readonly getEntries: () => Promise<readonly ContentSourceEntry[]>;
  readonly readEntry: (entry: ContentSourceEntry) => Promise<string>;
  readonly observability: Observability;
};

export class ContentBuildCoordinator {
  private preparation: Promise<ContentBuildPreparation> | null = null;

  constructor(
    private readonly dependencies: ContentBuildCoordinatorDependencies,
  ) {}

  getPreparation(
    incremental: boolean | undefined,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired = false,
  ): Promise<ContentBuildPreparation> {
    this.preparation ??= this.prepare(
      incremental,
      pipelineFingerprint,
      fullContentRegenerationRequired,
    );
    return this.preparation;
  }

  async commit(
    preparation: ContentBuildPreparation,
    manifest: ContentManifest,
    pipelineFingerprint: string | undefined,
    outputs: readonly OutputDescriptor[] = [],
    manifestEntries: readonly ContentManifestEntry[] = manifest.entries,
    trackedDependencies: ReadonlyMap<
      string,
      readonly CachedContentDependency[]
    > = new Map(),
  ): Promise<void> {
    const entriesBySlug = new Map(
      manifest.entries.map((entry) => [entry.slug, entry]),
    );
    const state: ContentBuildState = {
      version: CONTENT_BUILD_STATE_VERSION,
      entries: Object.fromEntries(
        preparation.currentEntries.map(({ entry, fingerprint }) => {
          const manifestEntry = entriesBySlug.get(toSlug(entry.path));
          return [
            entry.path,
            {
              fingerprint,
              aliases: preparation.currentContentAliases.get(entry.path) ?? [],
              dependencies: collectDependencies(
                manifestEntry,
                trackedDependencies.get(toSlug(entry.path)) ??
                  preparation.previousState?.entries[entry.path]
                    ?.dependencies ??
                  [],
              ),
              linkTargets: collectLinkTargets(manifestEntry),
            },
          ];
        }),
      ),
      contentIndex: Object.fromEntries(
        [...manifest.contentIndex.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      pipelineFingerprint,
      manifestEntries,
      outputs,
    };

    try {
      await saveContentBuildState(this.dependencies.buildStatePath, state);
    } catch (error) {
      this.dependencies.observability.logger.warn(
        "Incremental build state could not be persisted; the next build regenerates every note instead of reusing stale output.",
        {
          path: this.dependencies.buildStatePath,
          reason: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  private async prepare(
    incremental: boolean | undefined,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired: boolean,
  ): Promise<ContentBuildPreparation> {
    const entries = await this.dependencies.observability.tracer.span(
      "content.discovery",
      {},
      () => this.dependencies.getEntries(),
    );
    const currentEntries = await this.dependencies.observability.tracer.span(
      "content.fingerprint",
      {},
      () =>
        fingerprintContentEntries(entries, (entry) =>
          this.dependencies.readEntry(entry),
        ),
    );
    const previousState =
      incremental === false
        ? undefined
        : await loadContentBuildState(this.dependencies.buildStatePath);
    const changeSet = previousState
      ? diffContentEntries(previousState, currentEntries)
      : allContentChanged(currentEntries);
    const currentContentAliases = await this.getContentAliases(
      currentEntries,
      previousState,
      changeSet,
    );
    const {
      index: currentContentIndex,
      ambiguities: currentContentIndexAmbiguities,
    } = await this.dependencies.observability.tracer.span(
      "content.index",
      {},
      () =>
        ContentIndexBuilder.buildFromAliases(
          currentEntries.map(({ entry }) => entry),
          currentContentAliases,
        ),
    );
    const affected =
      !fullContentRegenerationRequired &&
      previousState?.pipelineFingerprint === pipelineFingerprint
        ? determineAffectedContent(
            changeSet,
            previousState,
            currentEntries.map(({ entry }) => entry.path),
            currentContentIndex,
          )
        : determineAffectedContent(
            allContentChanged(currentEntries),
            undefined,
            currentEntries.map(({ entry }) => entry.path),
            currentContentIndex,
          );
    this.dependencies.observability.tracer.event("build.incremental", {
      incremental: incremental !== false,
      added: changeSet.added.length,
      changed: changeSet.changed.length,
      removed: changeSet.removed.length,
      unchanged: changeSet.unchanged.length,
      affected: affected.direct.size + affected.dependent.size,
    });
    return {
      previousState,
      previousManifestEntriesBySlug: new Map(
        (previousState?.manifestEntries ?? []).map((entry) => [
          entry.slug,
          entry,
        ]),
      ),
      currentEntries,
      currentContentAliases,
      currentContentIndex,
      currentContentIndexAmbiguities,
      changeSet,
      affectedContent: affected,
    };
  }

  private async getContentAliases(
    currentEntries: readonly FingerprintedContentEntry[],
    previousState: ContentBuildState | undefined,
    changeSet: ContentChangeSet,
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    const changedPaths = new Set([...changeSet.added, ...changeSet.changed]);
    const aliases = new Map<string, readonly string[]>();

    for (const { entry } of currentEntries) {
      if (!entry.path.toLowerCase().endsWith(".md")) continue;
      const previousAliases = previousState?.entries[entry.path]?.aliases;
      if (!changedPaths.has(entry.path) && previousAliases) {
        aliases.set(entry.path, previousAliases);
        continue;
      }
      aliases.set(
        entry.path,
        extractFrontmatterAliases(
          readText(await this.dependencies.readEntry(entry)),
        ),
      );
    }

    return aliases;
  }
}

function readText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

/**
 * Records the notes and assets a manifest entry depends on. Note dependencies
 * use slugs so a change to the target note (including its resolved permalink)
 * invalidates dependents; asset dependencies use their paths so a changed
 * image/attachment (for example attachment size metadata) does too.
 */
function collectDependencies(
  manifestEntry: ContentManifestEntry | undefined,
  trackedDependencies:
    | readonly CachedContentDependency[]
    | readonly ContentBuildDependency[],
): ContentBuildDependency[] {
  if (!manifestEntry) return [];
  return [
    ...new Map(
      [
        ...manifestEntry.links
          .filter(
            (link): link is typeof link & { slug: string } =>
              link.slug !== null,
          )
          .map((link) => ({ kind: "content" as const, id: link.slug })),
        ...manifestEntry.assets.map((asset) => ({
          kind: "file" as const,
          id: asset.path.replace(/\\/g, "/"),
        })),
        ...trackedDependencies
          .map(toBuildDependency)
          .filter(
            (dependency): dependency is ContentBuildDependency =>
              dependency !== null,
          )
          .map((dependency) => ({
            kind: dependency.kind,
            id: dependency.id.replace(/\\/g, "/"),
          })),
      ].map((dependency) => [
        `${dependency.kind}:${dependency.id}`,
        dependency,
      ]),
    ).values(),
  ].toSorted((left, right) =>
    `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`),
  );
}

function toBuildDependency(dependency: {
  readonly kind: "content" | "file" | "link";
  readonly id: string;
}): ContentBuildDependency | null {
  if (dependency.kind === "content" || dependency.kind === "file") {
    return { kind: dependency.kind, id: dependency.id };
  }
  if (dependency.id.startsWith(LINK_LOCATION_PREFIX)) {
    return {
      kind: "content",
      id: dependency.id.slice(LINK_LOCATION_PREFIX.length),
    };
  }
  return null;
}

function collectLinkTargets(
  manifestEntry: ContentManifestEntry | undefined,
): string[] {
  if (!manifestEntry) return [];
  return [
    ...new Set(manifestEntry.links.map((link) => link.raw.toLowerCase())),
  ].sort();
}
