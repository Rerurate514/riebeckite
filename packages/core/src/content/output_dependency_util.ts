import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentOutputDependencyResolver } from "../types/plugin.js";
import { htmlOutputPath } from "./output_dependency_paths.js";
import { resolveContentOutputDependencies } from "./output_dependency_queries.js";
import type { OutputDescriptor } from "./output_dependency_types.js";

export function addOutput(
  outputs: Map<string, OutputDescriptor>,
  output: OutputDescriptor,
): void {
  const existing = outputs.get(output.path);
  if (existing) {
    assertNoGeneratedOutputCollision(existing, output);
  }
  outputs.set(output.path, output);
}

export function assertNoGeneratedOutputCollision(
  existing: OutputDescriptor,
  incoming: OutputDescriptor,
): void {
  if (
    existing.kind === incoming.kind &&
    existing.producer === incoming.producer
  )
    return;
  throw new Error(
    `Output path "${incoming.path}" collides with ${existing.kind} output owned by "${existing.producer}" and ${incoming.kind} output owned by "${incoming.producer}".`,
  );
}

export function isMarkdownPath(path: string): boolean {
  return path.endsWith(".md");
}

export function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

export function compareOutput(
  left: OutputDescriptor,
  right: OutputDescriptor,
): number {
  return (
    left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind)
  );
}

export function contentOutput(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  dependencies: readonly OutputDependency[] | ContentOutputDependencyResolver,
): OutputDescriptor {
  return {
    kind: "content",
    path: htmlOutputPath(entry.permalink),
    producer: `content:${entry.slug}`,
    dependencies: [
      { type: "content", slug: entry.slug },
      ...resolveContentOutputDependencies(dependencies, entry, manifest),
    ],
  };
}
