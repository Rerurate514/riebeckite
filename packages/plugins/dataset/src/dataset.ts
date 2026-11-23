import {
  type ConfigValidationIssue,
  type ContentManifestEntry,
  createEntryExcerpt,
  getEntryLanguage,
  getEntryPlainText,
  isExcludedSlugPath,
  type OutputDependency,
  type PlannedGeneratedOutput,
  resolveEntryDate,
} from "@riebeckite/core";

export const DATASET_SCHEMA_VERSION = 1;
export const DEFAULT_DATASET_DIRECTORY = "data";
export const DATASET_GENERATOR = "@riebeckite/plugin-dataset";

const MAX_BODY_LENGTH = 4_000;

export type DatasetPluginOptions = {
  readonly directory?: string;
  readonly exclude?: readonly string[];
};

export type DatasetPage = {
  readonly slug: string;
  readonly permalink: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly date: string | null;
  readonly excerpt: string;
  readonly body: string;
  readonly language?: string;
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
  const issues: ConfigValidationIssue[] = [];
  if (!options) return issues;
  if (options.directory !== undefined) {
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
  }
  if (options.exclude !== undefined) {
    if (!Array.isArray(options.exclude)) {
      issues.push({ path: "exclude", message: "Expected an array." });
    } else {
      options.exclude.forEach((slug, index) => {
        if (typeof slug !== "string" || slug.trim() === "") {
          issues.push({
            path: `exclude[${index}]`,
            message: "Expected a non-empty string.",
          });
        }
      });
    }
  }
  return issues;
}

export function resolveDatasetDirectory(directory: string | undefined): string {
  return directory?.trim() || DEFAULT_DATASET_DIRECTORY;
}

export function buildDatasetPages(
  entries: readonly ContentManifestEntry[],
  excludedSlugs: readonly string[] = [],
): readonly DatasetPage[] {
  return entries
    .filter((entry) => !isExcludedSlugPath(entry.slug, excludedSlugs))
    .map((entry) => {
      const language = getEntryLanguage(entry);
      return {
        slug: entry.slug,
        permalink: entry.permalink,
        title: entry.title,
        tags: entry.tags,
        date: resolveEntryDate(entry.frontmatter),
        excerpt: createEntryExcerpt(entry),
        body: getEntryPlainText(entry).slice(0, MAX_BODY_LENGTH),
        ...(language === undefined ? {} : { language }),
      };
    })
    .sort(compareBySlug);
}

export function buildDatasetLinks(
  entries: readonly ContentManifestEntry[],
  excludedSlugs: readonly string[] = [],
): readonly DatasetLink[] {
  const published = entries.filter(
    (entry) => !isExcludedSlugPath(entry.slug, excludedSlugs),
  );
  const permalinks = new Map(
    published.map((entry) => [entry.slug, entry.permalink] as const),
  );
  const links: DatasetLink[] = [];
  for (const entry of published) {
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
  excludedSlugs: readonly string[] = [],
): readonly PlannedGeneratedOutput[] {
  const pages = buildDatasetPages(entries, excludedSlugs);
  const links = buildDatasetLinks(entries, excludedSlugs);
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
