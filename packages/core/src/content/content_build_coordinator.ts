import type { Observability } from "../observability.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import { determineAffectedContent } from "./affected_content.js";
import {
  CONTENT_BUILD_STATE_VERSION,
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
import { fingerprintContentEntries } from "./content_fingerprint.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import type { ContentSourceEntry } from "./content_source.js";

export type ContentBuildPreparation = {
  readonly previousState: ContentBuildState | undefined;
  readonly currentEntries: readonly FingerprintedContentEntry[];
  readonly currentContentIndex: Map<string, string>;
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
  ): Promise<ContentBuildPreparation> {
    this.preparation ??= this.prepare(incremental, pipelineFingerprint);
    return this.preparation;
  }

  async commit(
    preparation: ContentBuildPreparation,
    manifest: ContentManifest,
    pipelineFingerprint: string | undefined,
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
              dependencies: collectDependencies(manifestEntry),
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
      manifestEntries: manifest.entries,
    };

    try {
      await saveContentBuildState(this.dependencies.buildStatePath, state);
    } catch {}
  }

  private async prepare(
    incremental: boolean | undefined,
    pipelineFingerprint: string | undefined,
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
    const currentContentIndex =
      await this.dependencies.observability.tracer.span(
        "content.index",
        {},
        () =>
          new ContentIndexBuilder({
            scan: async () => currentEntries.map(({ entry }) => entry),
            read: (entry) => this.dependencies.readEntry(entry),
          }).build(
            currentEntries.map(({ entry }) => entry),
            (entry) => this.dependencies.readEntry(entry),
          ),
      );
    const previousState =
      incremental === false
        ? undefined
        : await loadContentBuildState(this.dependencies.buildStatePath);
    const changeSet = previousState
      ? diffContentEntries(previousState, currentEntries)
      : allContentChanged(currentEntries);
    const affected =
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
      currentEntries,
      currentContentIndex,
      changeSet,
      affectedContent: affected,
    };
  }
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
): string[] {
  if (!manifestEntry) return [];
  return [
    ...new Set([
      ...manifestEntry.links
        .filter(
          (link): link is typeof link & { slug: string } => link.slug !== null,
        )
        .map((link) => link.slug),
      ...manifestEntry.assets.map((asset) => asset.path),
    ]),
  ].sort();
}

function collectLinkTargets(
  manifestEntry: ContentManifestEntry | undefined,
): string[] {
  if (!manifestEntry) return [];
  return [
    ...new Set(manifestEntry.links.map((link) => link.raw.toLowerCase())),
  ].sort();
}
