import type { Observability } from "../observability.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import { determineAffectedContent } from "./affected_content.js";
import type {
  ContentBuildPlan,
  FullRegenerationReason,
} from "./content_build_plan.js";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildDependency,
  type ContentBuildState,
  type FingerprintedContentEntry,
  type ManifestHookCacheEntry,
  type PersistedExternalDependency,
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

type ContentBuildCoordinatorDependencies = {
  readonly buildStatePath: string;
  readonly getEntries: () => Promise<readonly ContentSourceEntry[]>;
  readonly readEntry: (entry: ContentSourceEntry) => Promise<string>;
  readonly observability: Observability;
  readonly includeFileMetadata: boolean;
};

export class ContentBuildCoordinator {
  private plan: Promise<ContentBuildPlan> | null = null;

  constructor(
    private readonly dependencies: ContentBuildCoordinatorDependencies,
  ) {}

  getPlan(
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired = false,
    externalDependencies: readonly ExternalDependencySnapshot[] = [],
    externalDependencyFailures: readonly ExternalDependencyFailure[] = [],
    publishingBuildTime = new Date(),
  ): Promise<ContentBuildPlan> {
    if (this.plan) return this.plan;

    const plan = this.prepare(
      incremental,
      pipelineFingerprint,
      fullContentRegenerationRequired,
      externalDependencies,
      externalDependencyFailures,
      publishingBuildTime,
    );
    this.plan = plan;
    void plan.catch(() => {
      if (this.plan === plan) this.plan = null;
    });
    return plan;
  }

  async commit(
    plan: ContentBuildPlan,
    manifest: ContentManifest,
    pipelineFingerprint: string | undefined,
    outputs: readonly OutputDescriptor[] = [],
    manifestEntries: readonly ContentManifestEntry[] = manifest.entries,
    trackedDependencies: ReadonlyMap<
      string,
      readonly CachedContentDependency[]
    > = new Map(),
    externalDependencies: readonly ExternalDependencySnapshot[] = [],
    processedContentCacheFingerprints: ReadonlyMap<
      string,
      string | undefined
    > = new Map(),
    manifestHookCache: readonly ManifestHookCacheEntry[] = [],
    publishingBuildTime: Date,
    provenance?: BuildProvenance,
  ): Promise<void> {
    const entriesBySlug = new Map(
      manifest.entries.map((entry) => [entry.slug, entry]),
    );
    const nextChangeAt = nextPublishingChangeAt(manifest, publishingBuildTime);
    const state: ContentBuildState = {
      version: CONTENT_BUILD_STATE_VERSION,
      entries: Object.fromEntries(
        plan.currentEntries.map(({ entry, fingerprint }) => {
          const manifestEntry = entriesBySlug.get(toSlug(entry.path));
          return [
            entry.path,
            {
              fingerprint,
              aliases: plan.currentContentAliases.get(entry.path) ?? [],
              dependencies: collectDependencies(
                manifestEntry,
                trackedDependencies.get(toSlug(entry.path)) ??
                  plan.previousState?.entries[entry.path]?.dependencies ??
                  [],
              ),
              linkTargets: collectLinkTargets(manifestEntry),
              ...(processedContentCacheFingerprints.get(toSlug(entry.path))
                ? {
                    processedContentCacheFingerprint:
                      processedContentCacheFingerprints.get(toSlug(entry.path)),
                  }
                : {}),
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
      externalDependencies: externalDependencies.map(
        ({ id, fingerprint, scope, expiresAt }) => ({
          id,
          fingerprint,
          scope,
          ...(expiresAt === undefined ? {} : { expiresAt }),
        }),
      ),
      manifestHookCache,
      ...(provenance === undefined ? {} : { provenance }),
      ...(nextChangeAt
        ? {
            nextPublishingChangeAt: nextChangeAt,
          }
        : {}),
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
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired: boolean,
    externalDependencies: readonly ExternalDependencySnapshot[],
    externalDependencyFailures: readonly ExternalDependencyFailure[],
    publishingBuildTime: Date,
  ): Promise<ContentBuildPlan> {
    const entries = await this.dependencies.observability.tracer.span(
      "content.discovery",
      {},
      () => this.dependencies.getEntries(),
    );
    const currentEntries = await this.dependencies.observability.tracer.span(
      "content.fingerprint",
      {},
      () =>
        fingerprintContentEntries(
          entries,
          (entry) => this.dependencies.readEntry(entry),
          this.dependencies.includeFileMetadata,
        ),
    );
    const previousState = await this.dependencies.observability.tracer.span(
      "content.build-state.load",
      { incremental },
      async () =>
        incremental
          ? await loadContentBuildState(this.dependencies.buildStatePath)
          : undefined,
    );
    const changeSet = await this.dependencies.observability.tracer.span(
      "content.change-set",
      {},
      () =>
        previousState
          ? diffContentEntries(previousState, currentEntries)
          : allContentChanged(currentEntries),
    );
    const currentContentAliases =
      await this.dependencies.observability.tracer.span(
        "content.aliases",
        {},
        () => this.getContentAliases(currentEntries, previousState, changeSet),
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
    const publishingStateExpired = isPublishingStateExpired(
      previousState,
      publishingBuildTime,
    );
    const affected = await this.dependencies.observability.tracer.span(
      "content.affected",
      { fullContentRegenerationRequired },
      () =>
        !fullContentRegenerationRequired &&
        !publishingStateExpired &&
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
            ),
    );
    const fullRegenerationReasons: FullRegenerationReason[] = [];
    if (!incremental) fullRegenerationReasons.push("incremental-disabled");
    else if (!previousState)
      fullRegenerationReasons.push("cache-missing-or-invalid");
    if (
      previousState &&
      previousState.pipelineFingerprint !== pipelineFingerprint
    )
      fullRegenerationReasons.push("pipeline-fingerprint-changed");
    if (fullContentRegenerationRequired)
      fullRegenerationReasons.push("content-plugin-uncacheable");
    if (publishingStateExpired)
      fullRegenerationReasons.push("publishing-state-expired");
    if (externalDependencyFailures.length > 0)
      fullRegenerationReasons.push("external-dependency-unavailable");
    this.dependencies.observability.tracer.event("build.incremental", {
      incremental,
      cacheValid: previousState !== undefined,
      fullRegenerationReasons: fullRegenerationReasons.join(","),
      externalDependencyFailures: externalDependencyFailures.length,
      added: changeSet.added.length,
      changed: changeSet.changed.length,
      removed: changeSet.removed.length,
      unchanged: changeSet.unchanged.length,
      affected: affected.direct.size + affected.dependent.size,
    });
    const reusableOutputs =
      incremental &&
      previousState?.pipelineFingerprint === pipelineFingerprint &&
      externalDependencyFailures.length === 0 &&
      !publishingStateExpired &&
      externalDependenciesEqual(
        previousState?.externalDependencies ?? [],
        externalDependencies,
      ) &&
      changeSet.added.length === 0 &&
      changeSet.changed.length === 0 &&
      changeSet.removed.length === 0
        ? previousState?.outputs
        : undefined;
    return {
      incremental,
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
      cacheValid: previousState !== undefined,
      fullRegenerationReasons,
      reusableOutputs,
      externalDependencies,
      externalDependencyFailures,
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

function externalDependenciesEqual(
  previous: readonly PersistedExternalDependency[],
  current: readonly ExternalDependencySnapshot[],
): boolean {
  if (previous.length !== current.length) return false;
  const currentById = new Map(
    current.map((dependency) => [dependency.id, dependency]),
  );
  return previous.every((dependency) => {
    const candidate = currentById.get(dependency.id);
    return (
      candidate !== undefined &&
      candidate.fingerprint === dependency.fingerprint &&
      candidate.expiresAt === dependency.expiresAt &&
      !isExpired(candidate.expiresAt)
    );
  });
}

function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) <= Date.now();
}

function isPublishingStateExpired(
  state: ContentBuildState | undefined,
  buildTime: Date,
): boolean {
  return (
    state?.nextPublishingChangeAt !== undefined &&
    Date.parse(state.nextPublishingChangeAt) <= buildTime.getTime()
  );
}

function nextPublishingChangeAt(
  manifest: ContentManifest,
  buildTime: Date,
): string | undefined {
  const next = manifest.entries
    .filter((entry) => entry.publishing.visibility === "scheduled")
    .map((entry) => entry.publishing.publishAt?.getTime())
    .filter(
      (time): time is number =>
        time !== undefined && time > buildTime.getTime(),
    )
    .reduce<number | undefined>(
      (earliest, time) =>
        earliest === undefined || time < earliest ? time : earliest,
      undefined,
    );
  return next === undefined ? undefined : new Date(next).toISOString();
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
