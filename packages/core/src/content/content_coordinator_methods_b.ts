import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import { determineAffectedContent } from "./affected_content.js";
import type { ContentBuildCoordinatorContext } from "./content_build_coordinator_context.js";
import type {
  ContentBuildPlan,
  FullRegenerationReason,
} from "./content_build_plan.js";
import type {
  ContentBuildState,
  FingerprintedContentEntry,
} from "./content_build_state.js";
import { loadContentBuildState } from "./content_build_state_store.js";
import type { ContentChangeSet } from "./content_change_set.js";
import { allContentChanged, diffContentEntries } from "./content_change_set.js";
import {
  externalDependenciesEqual,
  isPublishingStateExpired,
  readText,
} from "./content_coordinator_helpers.js";
import { fingerprintContentEntries } from "./content_fingerprint.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { extractFrontmatterAliases } from "./content_metadata.js";

export async function prepareImpl(
  m: ContentBuildCoordinatorContext,
  incremental: boolean,
  pipelineFingerprint: string | undefined,
  fullContentRegenerationRequired: boolean,
  externalDependencies: readonly ExternalDependencySnapshot[],
  externalDependencyFailures: readonly ExternalDependencyFailure[],
  publishingBuildTime: Date,
): Promise<ContentBuildPlan> {
  const entries = await m.dependencies.observability.tracer.span(
    "content.discovery",
    {},
    () => m.dependencies.getEntries(),
  );
  const previousState = await m.dependencies.observability.tracer.span(
    "content.build-state.load",
    { incremental },
    async () =>
      incremental
        ? await loadContentBuildState(m.dependencies.buildStatePath)
        : undefined,
  );
  const currentEntries = await m.dependencies.observability.tracer.span(
    "content.fingerprint",
    {},
    () =>
      fingerprintContentEntries(
        entries,
        (entry) => m.dependencies.readEntry(entry),
        m.dependencies.includeFileMetadata,
        previousState?.entries,
        m.dependencies.pathResolver?.isContentPath ??
          ((path) => path.toLowerCase().endsWith(".md")),
      ),
  );
  const changeSet = await m.dependencies.observability.tracer.span(
    "content.change-set",
    {},
    () =>
      previousState
        ? diffContentEntries(previousState, currentEntries)
        : allContentChanged(currentEntries),
  );
  const currentContentAliases = await m.dependencies.observability.tracer.span(
    "content.aliases",
    {},
    () => m.getContentAliases(currentEntries, previousState, changeSet),
  );
  const {
    index: currentContentIndex,
    ambiguities: currentContentIndexAmbiguities,
  } = await m.dependencies.observability.tracer.span("content.index", {}, () =>
    ContentIndexBuilder.buildFromAliases(
      currentEntries.map(({ entry }) => entry),
      currentContentAliases,
      m.dependencies.pathResolver?.isContentPath
        ? (path) => m.dependencies.pathResolver?.isContentPath(path) === true
        : undefined,
      m.dependencies.pathResolver
        ? (path) => m.dependencies.pathResolver?.toSlug(path)
        : undefined,
    ),
  );
  const publishingStateExpired = isPublishingStateExpired(
    previousState,
    publishingBuildTime,
  );
  const affected = await m.dependencies.observability.tracer.span(
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
            m.dependencies.pathResolver,
          )
        : determineAffectedContent(
            allContentChanged(currentEntries),
            undefined,
            currentEntries.map(({ entry }) => entry.path),
            currentContentIndex,
            m.dependencies.pathResolver,
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
  m.dependencies.observability.tracer.event("build.incremental", {
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

export async function getContentAliasesImpl(
  m: ContentBuildCoordinatorContext,
  currentEntries: readonly FingerprintedContentEntry[],
  previousState: ContentBuildState | undefined,
  changeSet: ContentChangeSet,
): Promise<ReadonlyMap<string, readonly string[]>> {
  const changedPaths = new Set([...changeSet.added, ...changeSet.changed]);
  const aliases = new Map<string, readonly string[]>();

  for (const { entry } of currentEntries) {
    if (!m.dependencies.pathResolver?.isContentPath(entry.path)) continue;
    const previousAliases = previousState?.entries[entry.path]?.aliases;
    if (!changedPaths.has(entry.path) && previousAliases) {
      aliases.set(entry.path, previousAliases);
      continue;
    }
    aliases.set(
      entry.path,
      extractFrontmatterAliases(
        readText(await m.dependencies.readEntry(entry)),
      ),
    );
  }

  return aliases;
}
