import { Pipeline } from "../pipeline.js";
import type {
  ContentManifest,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import {
  type ContentBuildPlan,
  type FullRegenerationReason,
  reusableOutputChangeSet,
} from "./content_build_plan.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import type { ContentBuildOptions } from "./content_manager_shared.js";
import {
  computeContentScopeFingerprint,
  computePipelineFingerprint,
  hasGlobalContentDependency,
  requiresFullContentRegeneration as requiresFullContentRegenerationForConfig,
} from "./content_persistent_cache.js";
import type { OutputChangeSet } from "./output_dependency.js";

export async function buildImpl(
  m: ContentManagerContext,
  options: ContentBuildOptions = {},
): Promise<ContentManifest> {
  return await m.getManifest(options);
}

export async function getNoChangeFastPathBlockReasonImpl(
  m: ContentManagerContext,
  options: ContentBuildOptions = {},
): Promise<string | undefined> {
  const plan = await m.getBuildPlan(options);
  if (plan.fullRegenerationReasons.includes("publishing-state-expired"))
    return "publishing-state-expired";
  if (
    plan.reusableOutputs?.some((output) =>
      output.dependencies.some((dependency) => dependency.type === "unknown"),
    )
  )
    return "output-dependency-unknown";
  return m.pluginRuntime.getNoChangeFastPathBlockReason(
    plan.previousState?.manifestHookCache ?? [],
    m.getPipelineFingerprint(),
  );
}

export async function getFullRegenerationReasonsImpl(
  m: ContentManagerContext,
): Promise<readonly FullRegenerationReason[]> {
  const plan = await m.getBuildPlan();
  return plan.fullRegenerationReasons;
}

export async function getOutputChangeSetImpl(
  m: ContentManagerContext,
  options: ContentBuildOptions = {},
): Promise<OutputChangeSet> {
  m.requestBuildStateCommit(options);
  if (m.outputChangeSet) {
    await m.commitBuildState();
    return m.outputChangeSet;
  }

  const plan = await m.getBuildPlan(options);
  if (plan.reusableOutputs) {
    m.outputChangeSet = await m
      .observability()
      .tracer.span(
        "output.dependencies.reuse",
        { outputCount: plan.reusableOutputs.length },
        async () => reusableOutputChangeSet(plan.reusableOutputs ?? []),
      );
    return m.outputChangeSet;
  }

  await m
    .observability()
    .tracer.span("output.dependencies.manifest", {}, () =>
      m.getManifest(options),
    );
  if (!m.outputChangeSet) {
    const manifest = await m.getManifest();
    const contentIndex = await m.getContentIndex();
    return await m.outputResolver.resolve({
      manifest,
      contentIndex,
      previousState: undefined,
      changeSet: {
        added: manifest.entries.map((entry) => entry.sourcePath ?? entry.slug),
        changed: [],
        removed: [],
        unchanged: [],
      },
      affectedContent: {
        direct: new Set(manifest.entries.map((entry) => entry.slug)),
        dependent: new Set(),
      },
      externalDependencies: plan.externalDependencies,
      externalDependencyFailures: plan.externalDependencyFailures,
    });
  }
  return m.outputChangeSet;
}

export function getBuildPlanImpl(
  m: ContentManagerContext,
  options?: ContentBuildOptions,
): Promise<ContentBuildPlan> {
  return m.buildSession.getPlan(options);
}

export function computePipelineFingerprintImpl(
  m: ContentManagerContext,
  locations?: ReadonlyMap<string, ContentPublicLocation>,
): string {
  const config = m.pipelineOptions.config;
  if (!config) return "";
  const contentScopeFingerprint =
    locations && hasGlobalContentDependency(config)
      ? computeContentScopeFingerprint(locations)
      : undefined;
  return computePipelineFingerprint(config, contentScopeFingerprint);
}

export function requiresFullContentRegenerationImpl(
  m: ContentManagerContext,
): boolean {
  const config = m.pipelineOptions.config;
  return config ? requiresFullContentRegenerationForConfig(config) : false;
}

export function getPipelineFingerprintImpl(
  m: ContentManagerContext,
): string | undefined {
  if (!m.pipelineOptions.config) return undefined;
  m.pipelineFingerprint ??= m.computePipelineFingerprint();
  return m.pipelineFingerprint;
}

export async function getPipelineImpl(
  m: ContentManagerContext,
): Promise<Pipeline> {
  if (m.pipeline) return m.pipeline;
  if (m.pipelinePromise) return await m.pipelinePromise;
  m.pipelinePromise = m.createPipeline();
  try {
    m.pipeline = await m.pipelinePromise;
    return m.pipeline;
  } finally {
    m.pipelinePromise = null;
  }
}

export async function createPipelineImpl(
  m: ContentManagerContext,
): Promise<Pipeline> {
  const [contentIndex, locations] = await Promise.all([
    m.getContentIndex(),
    m.getContentLocations(),
    m.ensureRoutableSlugs(),
  ]);
  if (m.pipelineOptions.config) {
    m.pipelineFingerprint = m.computePipelineFingerprint(locations);
  }
  return new Pipeline(
    contentIndex,
    new Map(
      [...locations.entries()].map(([slug, location]) => [
        slug,
        location.permalink,
      ]),
    ),
    (slug) => m.getPost(slug),
    {
      ...m.pipelineOptions,
      contentScopeFingerprint: m.pipelineFingerprint ?? undefined,
    },
    m.isBuildTime,
  );
}

export function enableBuildTimeImpl(m: ContentManagerContext): void {
  m.isBuildTime = true;
  m.pluginRuntime.enableBuildTime();
}

export function requestBuildStateCommitImpl(
  m: ContentManagerContext,
  options?: ContentBuildOptions,
): void {
  if (m.pipelineOptions.commitBuildState === false) return;
  if (options?.incremental !== false) m.buildStateCommitRequested = true;
}

export async function commitBuildStateImpl(
  m: ContentManagerContext,
): Promise<void> {
  if (
    m.buildStateCommitted ||
    !m.buildStateCommitRequested ||
    !m.manifest ||
    !m.outputChangeSet
  ) {
    return;
  }
  const manifest = m.manifest;
  const outputChangeSet = m.outputChangeSet;
  const plan = await m.getBuildPlan();
  if (!plan.incremental) return;
  await m
    .observability()
    .tracer.span("content.build-state.save", {}, () =>
      m.buildCoordinator.commit(
        plan,
        manifest,
        m.getPipelineFingerprint(),
        [...outputChangeSet.affected, ...outputChangeSet.unchanged],
        m.cacheManifestEntries,
        m.trackedContentDependencies,
        plan.externalDependencies,
        m.processedContentCacheFingerprints,
        m.pluginRuntime.getManifestHookCache(),
        m.publishingBuildTime,
        m.provenance,
      ),
    );
  m.buildStateCommitted = true;
}
