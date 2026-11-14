import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentOutputDependencyResolver } from "../types/plugin.js";
import { normalizePublicPath } from "./output_dependency_paths.js";
import type { OutputDescriptor } from "./output_dependency_types.js";

export function contentQueryValue(
  entry: ContentManifestEntry,
  property: string,
): unknown {
  switch (property) {
    case "file.name":
      return (entry.sourcePath ?? entry.slug).split("/").at(-1) ?? entry.slug;
    case "file.path":
      return entry.sourcePath ?? entry.slug;
    case "file.slug":
      return entry.slug;
    case "file.folder":
      return entry.slug.split("/").slice(0, -1).join("/");
    case "file.title":
      return entry.title;
    case "file.link":
    case "file.permalink":
      return entry.permalink;
    case "file.tags":
      return entry.tags;
    case "file.size":
      return entry.file?.size;
    case "file.ctime":
      return entry.file?.ctime;
    case "file.mtime":
      return entry.file?.mtime;
    case "file.links":
      return entry.links;
    case "file.backlinks":
      return entry.backlinks;
    case "file.content":
      return entry.html;
    default:
      return property
        .split(".")
        .reduce<unknown>(
          (value, key) =>
            value && typeof value === "object" && Object.hasOwn(value, key)
              ? (value as Record<string, unknown>)[key]
              : undefined,
          entry.frontmatter,
        );
  }
}

export function resolveContentOutputDependencies(
  dependencies: readonly OutputDependency[] | ContentOutputDependencyResolver,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): readonly OutputDependency[] {
  return typeof dependencies === "function"
    ? dependencies({ entry, manifest })
    : dependencies;
}

export function withPreviousDependencies(
  output: OutputDescriptor,
  previous: OutputDescriptor | undefined,
): OutputDescriptor {
  if (!previous || previous.kind !== output.kind) return output;
  return {
    ...output,
    dependencies: [...output.dependencies, ...previous.dependencies],
  };
}

export function publicLocationOwners(
  entries: readonly ContentManifestEntry[],
): ReadonlyMap<string, ContentManifestEntry> {
  return new Map(
    entries.map((entry) => [
      normalizePublicPath(entry.publicLocation.permalink),
      entry,
    ]),
  );
}
