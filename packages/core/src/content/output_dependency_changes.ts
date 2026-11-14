import type { ContentManifest } from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentOutputDependencyResolver } from "../types/plugin.js";
import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import {
  collectChangedContent,
  collectChangedFolders,
  collectChangedTags,
} from "./output_dependency_content.js";
import {
  changedExternalDependencies,
  changedExternalDependencyScopes,
  collectRefreshedContent,
} from "./output_dependency_external.js";
import { htmlOutputPath } from "./output_dependency_paths.js";
import { collectChangedProjections } from "./output_dependency_projection.js";
import {
  publicLocationOwners,
  withPreviousDependencies,
} from "./output_dependency_queries.js";
import {
  findChangedDerivedQuery,
  findChangedDerivedView,
  findOutputChangeReason,
} from "./output_dependency_reasons.js";
import type {
  OutputChangeReason,
  OutputChangeSet,
  OutputDescriptor,
} from "./output_dependency_types.js";
import {
  addOutput,
  compareOutput,
  contentOutput,
} from "./output_dependency_util.js";

export function determineOutputChanges(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
  readonly pluginPageOutputs?: readonly OutputDescriptor[];
  readonly contentOutputDependencies?:
    | readonly OutputDependency[]
    | ContentOutputDependencyResolver;
  readonly externalDependencies?: readonly ExternalDependencySnapshot[];
  readonly externalDependencyFailures?: readonly ExternalDependencyFailure[];
  readonly contentFingerprints?: ReadonlyMap<string, string | undefined>;
  readonly contentPathToSlug?: (path: string) => string | undefined;
}): OutputChangeSet {
  const current = buildOutputInventory(
    input.manifest,
    input.pluginPageOutputs,
    input.contentOutputDependencies,
  );
  const previous = new Map(
    (input.previousState?.outputs ?? []).map((output) => [output.path, output]),
  );
  const currentPublicLocations = publicLocationOwners(
    input.manifest.publicEntries,
  );
  const previousPublicLocations = publicLocationOwners(
    (input.previousState?.manifestEntries ?? []).filter(
      (entry) => entry.publishing.routable,
    ),
  );
  const changedContent = collectChangedContent(input);
  const refreshedContent = collectRefreshedContent(input);
  const changedFiles = new Set([
    ...input.changeSet.added,
    ...input.changeSet.changed,
    ...input.changeSet.removed,
  ]);
  const changedTags = collectChangedTags(
    input.previousState,
    input.manifest,
    changedContent,
  );
  const changedFolders = collectChangedFolders(
    input.previousState,
    input.manifest,
    changedContent,
  );
  const changedExternal = changedExternalDependencies(input);
  const changedExternalScopes = changedExternalDependencyScopes(input);
  const changedProjections = collectChangedProjections(input, changedContent);
  const affected = new Map<string, OutputDescriptor>();
  const unchanged: OutputDescriptor[] = [];
  const reasons = new Map<string, OutputChangeReason>();

  for (const output of current) {
    const previousOutput = previous.get(output.path);
    const reason =
      findChangedDerivedView(output, previousOutput) ??
      findChangedDerivedQuery(output, previousOutput) ??
      findOutputChangeReason(
        withPreviousDependencies(output, previousOutput),
        changedContent,
        refreshedContent,
        changedTags,
        changedFolders,
        changedFiles,
        changedExternal,
        changedExternalScopes,
        currentPublicLocations,
        previousPublicLocations,
        input.previousState?.manifestEntries ?? [],
        input.manifest.entries,
        changedProjections,
      );
    if (reason) {
      affected.set(output.path, output);
      reasons.set(output.path, reason);
    } else {
      unchanged.push(output);
    }
  }

  for (const output of current) {
    const previousOutput = previous.get(output.path);
    if (!previousOutput) {
      affected.set(output.path, output);
      reasons.set(output.path, { type: "new-output" });
    } else if (output.kind !== previousOutput.kind) {
      affected.set(output.path, output);
      reasons.set(output.path, {
        type: "kind-changed",
        previousKind: previousOutput.kind,
      });
    }
  }

  const currentPaths = new Set(current.map((output) => output.path));
  const removed = [...previous.values()].filter(
    (output) => !currentPaths.has(output.path),
  );
  const fullRegenerationRequired =
    (input.externalDependencyFailures?.length ?? 0) > 0 ||
    current.some((output) =>
      output.dependencies.some((dependency) => dependency.type === "unknown"),
    );
  const affectedValues = [...affected.values()].sort(compareOutput);
  const unchangedValues = unchanged
    .filter((output) => !affected.has(output.path))
    .sort(compareOutput);

  return {
    affected: affectedValues,
    removed: removed.sort(compareOutput),
    unchanged: unchangedValues,
    fullRegenerationRequired,
    candidateOutputCount: current.length,
    affectedOutputCount: affectedValues.length,
    removedOutputCount: removed.length,
    unchangedOutputCount: unchangedValues.length,
    reasons,
  };
}

export function buildOutputInventory(
  manifest: ContentManifest,
  pluginPageOutputs: readonly OutputDescriptor[] = [],
  contentOutputDependencies:
    | readonly OutputDependency[]
    | ContentOutputDependencyResolver = [],
): readonly OutputDescriptor[] {
  const outputs = new Map<string, OutputDescriptor>();
  for (const entry of manifest.publicEntries) {
    addOutput(
      outputs,
      contentOutput(entry, manifest, contentOutputDependencies),
    );
  }
  for (const [path, redirect] of manifest.publicRedirects) {
    const outputPath = htmlOutputPath(path);
    const existing = outputs.get(outputPath);
    if (
      existing?.kind === "content" &&
      existing.producer === `content:${redirect.slug}`
    )
      continue;
    addOutput(outputs, {
      kind: "redirect",
      path: outputPath,
      producer: `content:${redirect.slug}:redirect`,
      dependencies: [{ type: "content", slug: redirect.slug }],
    });
  }
  for (const output of pluginPageOutputs) {
    const path = htmlOutputPath(output.path);
    if (outputs.get(path)?.kind === "content") outputs.delete(path);
    addOutput(outputs, {
      ...output,
      path,
    });
  }
  for (const output of manifest.generatedOutputs) {
    addOutput(outputs, {
      kind: "generated",
      path: output.path,
      producer: `plugin:${output.owner}`,
      dependencies: output.dependencies ?? [{ type: "unknown" }],
    });
  }
  return [...outputs.values()].sort(compareOutput);
}
