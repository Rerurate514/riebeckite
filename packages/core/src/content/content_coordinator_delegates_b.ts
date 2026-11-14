import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import { asContentBuildCoordinatorContext } from "./content_build_coordinator_context.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type {
  ContentBuildState,
  FingerprintedContentEntry,
} from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import { ContentCoordinatorDelegatesA } from "./content_coordinator_delegates_a.js";
import {
  getContentAliasesImpl,
  prepareImpl,
} from "./content_coordinator_methods_b.js";

export class ContentCoordinatorDelegatesB extends ContentCoordinatorDelegatesA {
  async prepare(
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired: boolean,
    externalDependencies: readonly ExternalDependencySnapshot[],
    externalDependencyFailures: readonly ExternalDependencyFailure[],
    publishingBuildTime: Date,
  ): Promise<ContentBuildPlan> {
    return prepareImpl(
      asContentBuildCoordinatorContext(this),
      incremental,
      pipelineFingerprint,
      fullContentRegenerationRequired,
      externalDependencies,
      externalDependencyFailures,
      publishingBuildTime,
    );
  }

  async getContentAliases(
    currentEntries: readonly FingerprintedContentEntry[],
    previousState: ContentBuildState | undefined,
    changeSet: ContentChangeSet,
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    return getContentAliasesImpl(
      asContentBuildCoordinatorContext(this),
      currentEntries,
      previousState,
      changeSet,
    );
  }
}
