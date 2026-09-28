import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  escapeHtml,
  isPublished,
  type PostContent,
} from "@riebeckite/core";
import { config } from "../config";
import { content } from "../content";
import { slugifyTagPath } from "./tags";

export const TAG_BASE_PATH = "/tags";
export const ARCHIVE_BASE_PATH = "/archive";

/**
 * Listing pages are generated from the same Core collection mechanism: each
 * definition maps a taxonomy or archive to a site-local path, and the shared
 * query engine selects and orders the entries. Only the URL shape stays local
 * to the site.
 */
const definitions: readonly ContentCollectionDefinition[] = [
  {
    kind: "tag",
    basePath: TAG_BASE_PATH,
    groupBy: { by: "tags" },
    resolveTitle: ({ value }) => `#${value}`,
    resolvePath: ({ value }) => `${TAG_BASE_PATH}/${slugifyTagPath(value)}`,
  },
  {
    kind: "archive",
    basePath: ARCHIVE_BASE_PATH,
    groupBy: {
      by: "date",
      fields: ["published", "date", "created"],
      granularity: "month",
    },
    order: "desc",
    resolveTitle: ({ value }) => formatArchivePeriod(value),
    resolvePath: ({ value }) =>
      `${ARCHIVE_BASE_PATH}/${value.replace(/-/g, "/")}`,
  },
];

let cachedCollections: ContentCollection[] | null = null;

export async function buildCollections(): Promise<ContentCollection[]> {
  if (cachedCollections) return cachedCollections;

  const manifest = await content.getManifest();
  cachedCollections = buildContentCollections(
    manifest.entries.filter((entry) => isPublished(config, entry.frontmatter)),
    definitions,
  );
  return cachedCollections;
}

export async function findCollection(
  kind: string,
  path: string,
): Promise<ContentCollection | null> {
  const collections = await buildCollections();
  return (
    collections.find(
      (collection) => collection.kind === kind && collection.path === path,
    ) ?? null
  );
}

export function buildArchivePage(collection: ContentCollection): PostContent {
  const posts = collection.entries
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");

  return {
    frontmatter: {
      title: collection.title,
    },
    html: `<h1>${escapeHtml(collection.title)}</h1><ul>${posts}</ul>`,
  };
}

function formatArchivePeriod(value: string): string {
  const [year, month] = value.split("-");
  if (!year) return value;
  if (!month) return year;
  return `${year}年${Number(month)}月`;
}
