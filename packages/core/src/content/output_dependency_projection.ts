import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentBuildState } from "./content_build_state.js";

export type ProjectionName = Extract<
  OutputDependency,
  { type: "projection" }
>["projection"];

export function collectChangedProjections(
  input: {
    readonly manifest: ContentManifest;
    readonly previousState: ContentBuildState | undefined;
  },
  changedContent: ReadonlySet<string>,
): ReadonlySet<ProjectionName> {
  const changed = new Set<ProjectionName>();
  if (
    input.manifest.entries.length > 0 &&
    input.manifest.entries.every((entry) => changedContent.has(entry.slug))
  ) {
    changed.add("navigation");
    changed.add("recent-posts");
    return changed;
  }

  const previousEntries = (input.previousState?.manifestEntries ?? []).filter(
    (entry) => entry.publishing.discoverable,
  );
  const currentEntries = input.manifest.discoverableEntries;
  if (
    navigationFingerprint(previousEntries) !==
    navigationFingerprint(currentEntries)
  )
    changed.add("navigation");
  if (
    recentPostsFingerprint(previousEntries) !==
    recentPostsFingerprint(currentEntries)
  )
    changed.add("recent-posts");
  return changed;
}

export function navigationFingerprint(
  entries: readonly ContentManifestEntry[],
): string {
  return entries
    .map((entry) =>
      JSON.stringify([
        entry.publicLocation.metadata?.["l10n.translationId"] ?? entry.slug,
        entry.permalink,
        entry.title,
        entry.icon ?? null,
      ]),
    )
    .sort()
    .join("\n");
}

export function recentPostsFingerprint(
  entries: readonly ContentManifestEntry[],
): string {
  return JSON.stringify(
    entries.flatMap((entry) => {
      if (entry.slug === "index") return [];
      const postedAt =
        frontmatterDate(entry.frontmatter.date) ??
        frontmatterDate(entry.frontmatter.created) ??
        frontmatterDate(entry.frontmatter.published);
      return postedAt
        ? [[entry.slug, entry.permalink, entry.title, postedAt.toISOString()]]
        : [];
    }),
  );
}

export function frontmatterDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
