import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";

export type OutputKind = "content" | "redirect" | "plugin-page" | "generated";

export type OutputDescriptor = {
  readonly kind: OutputKind;
  readonly path: string;
  readonly producer: string;
  readonly dependencies: readonly OutputDependency[];
};

export type OutputChangeSet = {
  readonly affected: readonly OutputDescriptor[];
  readonly removed: readonly OutputDescriptor[];
  readonly unchanged: readonly OutputDescriptor[];
  readonly fullRegenerationRequired: boolean;
  readonly candidateOutputCount: number;
  readonly affectedOutputCount: number;
  readonly removedOutputCount: number;
  readonly unchangedOutputCount: number;
};

export function determineOutputChanges(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
  readonly pluginPageOutputs?: readonly OutputDescriptor[];
}): OutputChangeSet {
  const current = buildOutputInventory(input.manifest, input.pluginPageOutputs);
  const previous = new Map(
    (input.previousState?.outputs ?? []).map((output) => [output.path, output]),
  );
  const changedContent = collectChangedContent(input);
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
  const affected = new Map<string, OutputDescriptor>();
  const unchanged: OutputDescriptor[] = [];

  for (const output of current) {
    if (isOutputAffected(output, changedContent, changedTags, changedFolders)) {
      affected.set(output.path, output);
    } else {
      unchanged.push(output);
    }
  }

  for (const output of current) {
    const previousOutput = previous.get(output.path);
    if (!previousOutput || output.kind !== previousOutput.kind) {
      affected.set(output.path, output);
    }
  }

  const currentPaths = new Set(current.map((output) => output.path));
  const removed = [...previous.values()].filter(
    (output) => !currentPaths.has(output.path),
  );
  const fullRegenerationRequired = current.some((output) =>
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
  };
}

export function buildOutputInventory(
  manifest: ContentManifest,
  pluginPageOutputs: readonly OutputDescriptor[] = [],
): readonly OutputDescriptor[] {
  const outputs = new Map<string, OutputDescriptor>();
  for (const entry of manifest.publicEntries) {
    addOutput(outputs, contentOutput(entry));
  }
  for (const [path, redirect] of manifest.publicRedirects) {
    addOutput(outputs, {
      kind: "redirect",
      path: htmlOutputPath(path),
      producer: `content:${redirect.slug}:redirect`,
      dependencies: [{ type: "content", slug: redirect.slug }],
    });
  }
  for (const output of pluginPageOutputs) {
    addOutput(outputs, { ...output, path: htmlOutputPath(output.path) });
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

export function htmlOutputPath(pathname: string): string {
  const normalized = normalizePublicPath(pathname);
  if (normalized === "/") return "index.html";
  const withoutSlash = normalized.replace(/^\//, "");
  return `${withoutSlash}/index.html`;
}

function contentOutput(entry: ContentManifestEntry): OutputDescriptor {
  return {
    kind: "content",
    path: htmlOutputPath(entry.permalink),
    producer: `content:${entry.slug}`,
    dependencies: [{ type: "content", slug: entry.slug }],
  };
}

function isOutputAffected(
  output: OutputDescriptor,
  changedContent: ReadonlySet<string>,
  changedTags: ReadonlySet<string>,
  changedFolders: ReadonlySet<string>,
): boolean {
  for (const dependency of output.dependencies) {
    if (dependency.type === "unknown") return true;
    if (dependency.type === "global") return changedContent.size > 0;
    if (dependency.type === "content" && changedContent.has(dependency.slug)) {
      return true;
    }
    if (dependency.type === "tag" && changedTags.has(dependency.tag))
      return true;
    if (dependency.type === "folder" && changedFolders.has(dependency.folder)) {
      return true;
    }
  }
  return false;
}

function collectChangedContent(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
}): Set<string> {
  const changed = new Set([
    ...input.affectedContent.direct,
    ...input.affectedContent.dependent,
    ...input.changeSet.removed.filter(isMarkdownPath).map(toSlug),
  ]);
  const previousEntries = input.previousState?.manifestEntries ?? [];
  const currentEntries = input.manifest.entries;
  const previousBySlug = new Map(
    previousEntries.map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    currentEntries.map((entry) => [entry.slug, entry]),
  );
  for (const slug of changed) {
    for (const target of linkTargets(previousBySlug.get(slug)))
      changed.add(target);
    for (const target of linkTargets(currentBySlug.get(slug)))
      changed.add(target);
  }
  return changed;
}

function collectChangedTags(
  previousState: ContentBuildState | undefined,
  manifest: ContentManifest,
  changedContent: ReadonlySet<string>,
): Set<string> {
  const previousBySlug = new Map(
    (previousState?.manifestEntries ?? []).map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    manifest.entries.map((entry) => [entry.slug, entry]),
  );
  const tags = new Set<string>();
  for (const slug of changedContent) {
    for (const tag of previousBySlug.get(slug)?.tags ?? []) tags.add(tag);
    for (const tag of currentBySlug.get(slug)?.tags ?? []) tags.add(tag);
  }
  return tags;
}

function collectChangedFolders(
  previousState: ContentBuildState | undefined,
  manifest: ContentManifest,
  changedContent: ReadonlySet<string>,
): Set<string> {
  const previousBySlug = new Map(
    (previousState?.manifestEntries ?? []).map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    manifest.entries.map((entry) => [entry.slug, entry]),
  );
  const folders = new Set<string>();
  for (const slug of changedContent) {
    folders.add(folderOf(previousBySlug.get(slug)?.slug ?? slug));
    folders.add(folderOf(currentBySlug.get(slug)?.slug ?? slug));
  }
  return folders;
}

function linkTargets(entry: ContentManifestEntry | undefined): string[] {
  if (!entry) return [];
  return entry.links
    .filter(
      (link): link is typeof link & { slug: string } => link.slug !== null,
    )
    .map((link) => link.slug);
}

function addOutput(
  outputs: Map<string, OutputDescriptor>,
  output: OutputDescriptor,
): void {
  outputs.set(output.path, output);
}

function normalizePublicPath(pathname: string): string {
  const path = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

function folderOf(slug: string): string {
  const segments = slug.split("/");
  segments.pop();
  return segments.join("/");
}

function isMarkdownPath(path: string): boolean {
  return path.endsWith(".md");
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

function compareOutput(
  left: OutputDescriptor,
  right: OutputDescriptor,
): number {
  return (
    left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind)
  );
}
