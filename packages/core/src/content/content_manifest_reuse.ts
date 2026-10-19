import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { ContentBuildPlan } from "./content_build_plan.js";

type ReuseManifestEntryInput = {
  readonly slug: string;
  readonly plan: ContentBuildPlan;
  readonly pipelineFingerprint: string | undefined;
  readonly getContentCacheFingerprint: () => string | undefined;
};

type ReusedManifestEntry = {
  readonly entry: ContentManifestEntry;
  readonly contentCacheFingerprint: string;
};

export function reuseManifestEntry(
  input: ReuseManifestEntryInput,
): ReusedManifestEntry | null {
  const { plan, slug } = input;
  if (!plan.previousState?.manifestEntries) return null;
  if (plan.previousState.pipelineFingerprint !== input.pipelineFingerprint) {
    return null;
  }
  if (plan.affectedContent.direct.has(slug)) return null;
  if (plan.affectedContent.dependent.has(slug)) return null;
  const contentCacheFingerprint = input.getContentCacheFingerprint();
  if (!contentCacheFingerprint) return null;
  if (
    plan.previousState.entries[`${slug}.md`]
      ?.processedContentCacheFingerprint !== contentCacheFingerprint
  ) {
    return null;
  }

  const entry = plan.previousManifestEntriesBySlug.get(slug);
  if (!entry) return null;
  return {
    entry: cloneManifestEntry(entry),
    contentCacheFingerprint,
  };
}

function cloneManifestEntry(entry: ContentManifestEntry): ContentManifestEntry {
  return {
    ...entry,
    publicLocation: { ...entry.publicLocation },
    frontmatter: { ...entry.frontmatter },
    ...(entry.file
      ? {
          file: {
            ...(entry.file.size === undefined ? {} : { size: entry.file.size }),
            ...reviveFileDate(entry.file.ctime, "ctime"),
            ...reviveFileDate(entry.file.mtime, "mtime"),
          },
        }
      : {}),
    aliases: [...(entry.aliases ?? [])],
    tags: [...entry.tags],
    links: entry.links.map((link) => ({ ...link })),
    backlinks: [...entry.backlinks],
    assets: entry.assets.map((asset) => ({ ...asset })),
    ...(entry.headTags ? { headTags: [...entry.headTags] } : {}),
  };
}

function reviveFileDate(
  value: Date | string | undefined,
  key: "ctime" | "mtime",
): Partial<ContentManifestEntry["file"]> {
  if (value === undefined) return {};
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? {} : { [key]: date };
}
