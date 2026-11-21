import {
  type ConfigValidationIssue,
  type ContentManifestEntry,
  type OutputDependency,
  type PlannedGeneratedOutput,
  resolveEntryDate,
} from "@riebeckite/core";

export const DATASET_SCHEMA_VERSION = 1;
export const DEFAULT_DATASET_DIRECTORY = "data";
export const DATASET_GENERATOR = "@riebeckite/plugin-dataset";

export type DatasetPluginOptions = {
  readonly directory?: string;
};

export type DatasetPage = {
  readonly slug: string;
  readonly permalink: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly date: string | null;
};

export type DatasetLink = {
  readonly sourceSlug: string;
  readonly sourcePermalink: string;
  readonly targetSlug: string;
  readonly targetPermalink: string;
  readonly raw: string;
  readonly embed: boolean;
};

export type DatasetIndex = {
  readonly schemaVersion: number;
  readonly generator: string;
  readonly pages: number;
  readonly links: number;
};

export function validateDatasetOptions(
  options: DatasetPluginOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options || options.directory === undefined) return [];
  const issues: ConfigValidationIssue[] = [];
  if (
    typeof options.directory !== "string" ||
    options.directory.trim() === ""
  ) {
    issues.push({
      path: "directory",
      message: "Expected a non-empty string.",
    });
  } else if (options.directory.split("/").some(isInvalidSegment)) {
    issues.push({
      path: "directory",
      message:
        "Expected a relative directory path without empty, '.', or '..' segments.",
    });
  }
  return issues;
}

export function resolveDatasetDirectory(directory: string | undefined): string {
  return directory?.trim() || DEFAULT_DATASET_DIRECTORY;
}

export function buildDatasetPages(
  entries: readonly ContentManifestEntry[],
): readonly DatasetPage[] {
  return entries
    .map((entry) => ({
      slug: entry.slug,
      permalink: entry.permalink,
      title: entry.title,
      tags: entry.tags,
      date: resolveEntryDate(entry.frontmatter),
    }))
    .sort(compareBySlug);
}

export function buildDatasetLinks(
  entries: readonly ContentManifestEntry[],
): readonly DatasetLink[] {
  const permalinks = new Map(
    entries.map((entry) => [entry.slug, entry.permalink] as const),
  );
  const links: DatasetLink[] = [];
  for (const entry of entries) {
    for (const link of entry.links) {
      if (link.kind !== "note" || link.slug === null) continue;
      const targetPermalink = permalinks.get(link.slug);
      if (targetPermalink === undefined) continue;
      links.push({
        sourceSlug: entry.slug,
        sourcePermalink: entry.permalink,
        targetSlug: link.slug,
        targetPermalink,
        raw: link.raw,
        embed: link.embed,
      });
    }
  }
  return links.sort(
    (a, b) =>
      compareStrings(a.sourceSlug, b.sourceSlug) ||
      compareStrings(a.targetSlug, b.targetSlug) ||
      compareStrings(a.raw, b.raw),
  );
}

export function buildDatasetIndex(
  pages: readonly DatasetPage[],
  links: readonly DatasetLink[],
): DatasetIndex {
  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    generator: DATASET_GENERATOR,
    pages: pages.length,
    links: links.length,
  };
}

export function toNdjson(records: readonly unknown[]): string {
  if (records.length === 0) return "";
  return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

export function buildDatasetOutputs(
  entries: readonly ContentManifestEntry[],
  directory: string,
): readonly PlannedGeneratedOutput[] {
  const pages = buildDatasetPages(entries);
  const links = buildDatasetLinks(entries);
  const dependencies: readonly OutputDependency[] = [{ type: "global" }];
  return [
    {
      path: `${directory}/pages.ndjson`,
      content: toNdjson(pages),
      dependencies,
    },
    {
      path: `${directory}/links.ndjson`,
      content: toNdjson(links),
      dependencies,
    },
    {
      path: `${directory}/index.json`,
      content: `${JSON.stringify(buildDatasetIndex(pages, links), null, 2)}\n`,
      dependencies,
    },
  ];
}

function compareBySlug(a: { slug: string }, b: { slug: string }): number {
  return compareStrings(a.slug, b.slug);
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isInvalidSegment(segment: string): boolean {
  return segment === "" || segment === "." || segment === "..";
}
