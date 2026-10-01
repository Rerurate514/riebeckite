import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
import { content } from "../content";

export const ARCHIVE_BASE_PATH = "/archive";

/**
 * Archive pages are generated from the Core collection mechanism. Taxonomy
 * listings are provided by the taxonomy plugin's Page Type instead.
 */
const definitions: readonly ContentCollectionDefinition[] = [
  {
    kind: "archive",
    basePath: ARCHIVE_BASE_PATH,
    groupBy: {
      by: "date",
      fields: ["published", "date", "created"],
      granularity: "month",
    },
    order: "desc",
    pageSize: 10,
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
    manifest.discoverableEntries,
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

  const page = collection.page;
  const navigation: string[] = [];
  if (page.previousPath) {
    navigation.push(
      `<a rel="prev" href="${escapeHtml(page.previousPath)}">前のページ</a>`,
    );
  }
  if (page.nextPath) {
    navigation.push(
      `<a rel="next" href="${escapeHtml(page.nextPath)}">次のページ</a>`,
    );
  }
  const pagination =
    navigation.length > 0
      ? `<nav class="archive-pagination">${navigation.join(" ")}</nav>`
      : "";

  return {
    frontmatter: {
      title: collection.title,
    },
    html: `<h1>${escapeHtml(collection.title)}</h1><ul>${posts}</ul>${pagination}`,
  };
}

function formatArchivePeriod(value: string): string {
  const [year, month] = value.split("-");
  if (!year) return value;
  if (!month) return year;
  return `${year}年${Number(month)}月`;
}
