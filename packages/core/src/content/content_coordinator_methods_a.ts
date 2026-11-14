import type { BuildProvenance } from "../provenance/provenance.js";
import {
  appendProvenanceHistory,
  attachProvenanceArtifacts,
} from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { ContentBuildCoordinatorContext } from "./content_build_coordinator_context.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type {
  ContentBuildState,
  ManifestHookCacheEntry,
} from "./content_build_state.js";
import { CONTENT_BUILD_STATE_VERSION } from "./content_build_state.js";
import {
  loadContentBuildState,
  saveContentBuildState,
} from "./content_build_state_store.js";
import {
  collectDependencies,
  collectLinkTargets,
  nextPublishingChangeAt,
  toSlug,
} from "./content_coordinator_helpers.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import { fingerprintContentMetadata } from "./content_fingerprint.js";
import type { OutputDescriptor } from "./output_dependency.js";

export function getPlanImpl(
  m: ContentBuildCoordinatorContext,
  incremental: boolean,
  pipelineFingerprint: string | undefined,
  fullContentRegenerationRequired = false,
  externalDependencies: readonly ExternalDependencySnapshot[] = [],
  externalDependencyFailures: readonly ExternalDependencyFailure[] = [],
  publishingBuildTime = new Date(),
): Promise<ContentBuildPlan> {
  if (m.plan) return m.plan;

  const plan = m.prepare(
    incremental,
    pipelineFingerprint,
    fullContentRegenerationRequired,
    externalDependencies,
    externalDependencyFailures,
    publishingBuildTime,
  );
  m.plan = plan;
  void plan.catch(() => {
    if (m.plan === plan) m.plan = null;
  });
  return plan;
}

export async function commitImpl(
  m: ContentBuildCoordinatorContext,
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
  const currentPaths = plan.currentEntries.map(({ entry }) => entry.path);
  const stateEntries = await Promise.all(
    plan.currentEntries.map(async ({ entry, fingerprint }) => {
      const slug =
        m.dependencies.pathResolver?.toSlug(entry.path) ?? toSlug(entry.path);
      const manifestEntry = entriesBySlug.get(slug);
      const contentDependencies =
        (await m.dependencies.getContentDependencies?.(entry, currentPaths)) ??
        [];
      return [
        entry.path,
        {
          fingerprint,
          metadataFingerprint: fingerprintContentMetadata(entry),
          aliases: plan.currentContentAliases.get(entry.path) ?? [],
          dependencies: collectDependencies(
            manifestEntry,
            trackedDependencies.get(slug) ??
              plan.previousState?.entries[entry.path]?.dependencies ??
              [],
            contentDependencies,
          ),
          linkTargets: collectLinkTargets(manifestEntry),
          ...(processedContentCacheFingerprints.get(slug)
            ? {
                processedContentCacheFingerprint:
                  processedContentCacheFingerprints.get(slug),
              }
            : {}),
        },
      ] as const;
    }),
  );
  const state: ContentBuildState = {
    version: CONTENT_BUILD_STATE_VERSION,
    entries: Object.fromEntries(stateEntries),
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
    ...(provenance === undefined
      ? {}
      : {
          provenanceHistory: appendProvenanceHistory(
            plan.previousState?.provenanceHistory ??
              (plan.previousState?.provenance === undefined
                ? []
                : [plan.previousState.provenance]),
            provenance,
          ),
        }),
    ...(nextChangeAt
      ? {
          nextPublishingChangeAt: nextChangeAt,
        }
      : {}),
  };

  try {
    await saveContentBuildState(m.dependencies.buildStatePath, state);
  } catch (error) {
    m.dependencies.observability.logger.warn(
      "Incremental build state could not be persisted; the next build regenerates every note instead of reusing stale output.",
      {
        path: m.dependencies.buildStatePath,
        reason: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export async function attachFinalOutputArtifactsImpl(
  m: ContentBuildCoordinatorContext,
  buildId: string,
  fingerprints: Readonly<Record<string, string>>,
  cacheHits: ReadonlySet<string>,
): Promise<void> {
  try {
    const state = await loadContentBuildState(m.dependencies.buildStatePath);
    if (!state?.provenance || state.provenance.buildId !== buildId) return;
    const provenance = attachProvenanceArtifacts(state.provenance, {
      fingerprints,
      cacheHits,
    });
    const provenanceHistory = (state.provenanceHistory ?? []).map((entry) =>
      entry.buildId === buildId ? provenance : entry,
    );
    await saveContentBuildState(m.dependencies.buildStatePath, {
      ...state,
      provenance,
      provenanceHistory,
    });
  } catch (error) {
    m.dependencies.observability.logger.warn(
      "Final output provenance could not be persisted.",
      { reason: error instanceof Error ? error.message : String(error) },
    );
  }
}
