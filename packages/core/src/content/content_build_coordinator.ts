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
import type { ContentSourceEntry } from "./content_source.js";

export type ContentBuildPreparation = {
  readonly previousState: ContentBuildState | undefined;
  readonly currentEntries: readonly FingerprintedContentEntry[];
  readonly changeSet: ContentChangeSet;
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
  ): Promise<ContentBuildPreparation> {
    this.preparation ??= this.prepare(incremental);
    return this.preparation;
  }

  async commit(
    preparation: ContentBuildPreparation,
    manifest: ContentManifest,
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
            },
          ];
        }),
      ),
      contentIndex: Object.fromEntries(
        [...manifest.contentIndex.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    };

    try {
      await saveContentBuildState(this.dependencies.buildStatePath, state);
    } catch {
    }
  }

  private async prepare(
    incremental: boolean | undefined,
  ): Promise<ContentBuildPreparation> {
    const currentEntries = await fingerprintContentEntries(
      await this.dependencies.getEntries(),
      (entry) => this.dependencies.readEntry(entry),
    );
    const previousState =
      incremental === false
        ? undefined
        : await loadContentBuildState(this.dependencies.buildStatePath);
    const changeSet = previousState
      ? diffContentEntries(previousState, currentEntries)
      : allContentChanged(currentEntries);
    const affected = determineAffectedContent(
      changeSet,
      previousState,
      currentEntries.map(({ entry }) => entry.path),
    );
    this.dependencies.observability.tracer.event("build.incremental", {
      incremental: incremental !== false,
      added: changeSet.added.length,
      changed: changeSet.changed.length,
      removed: changeSet.removed.length,
      unchanged: changeSet.unchanged.length,
      affected: affected.direct.size + affected.dependent.size,
    });
    return { previousState, currentEntries, changeSet };
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
    ...new Set(
      manifestEntry.links
        .filter(
          (link): link is typeof link & { slug: string } => link.slug !== null,
        )
        .map((link) => link.slug),
    ),
  ].sort();
}
