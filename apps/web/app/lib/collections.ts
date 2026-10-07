import { content } from "virtual:riebeckite/content";
import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  escapeHtml,
  type PostContent,
} from "@riebeckite/core";
import {
  archivePaginationLabels,
  formatArchivePeriod,
  resolveWebLocale,
  type WebLocale,
} from "./locale";

export const ARCHIVE_BASE_PATH = "/archive";

/**
 * Archive pages are generated from the Core collection mechanism. Taxonomy
 * listings are provided by the taxonomy plugin's Page Type instead.
 */
function archiveDefinitions(
  locale: WebLocale,
): readonly ContentCollectionDefinition[] {
  return [
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
      resolveTitle: ({ value }) => formatArchivePeriod(value, locale),
      resolvePath: ({ value }) =>
        `${ARCHIVE_BASE_PATH}/${value.replace(/-/g, "/")}`,
    },
  ];
}

const collectionCache = new Map<WebLocale, ContentCollection[]>();

export async function buildCollections(
  lang: string,
): Promise<ContentCollection[]> {
  const locale = resolveWebLocale(lang);
  const cached = collectionCache.get(locale);
  if (cached) return cached;

  const manifest = await content.getManifest();
  const collections = buildContentCollections(
    manifest.discoverableEntries,
    archiveDefinitions(locale),
  );
  collectionCache.set(locale, collections);
  return collections;
}

export async function findCollection(
  kind: string,
  path: string,
  lang: string,
): Promise<ContentCollection | null> {
  const collections = await buildCollections(lang);
  return (
    collections.find(
      (collection) => collection.kind === kind && collection.path === path,
    ) ?? null
  );
}

export function buildArchivePage(
  collection: ContentCollection,
  lang: string,
): PostContent {
  const posts = collection.entries
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");

  const labels = archivePaginationLabels(lang);
  const page = collection.page;
  const navigation: string[] = [];
  if (page.previousPath) {
    navigation.push(
      `<a rel="prev" href="${escapeHtml(page.previousPath)}">${labels.previous}</a>`,
    );
  }
  if (page.nextPath) {
    navigation.push(
      `<a rel="next" href="${escapeHtml(page.nextPath)}">${labels.next}</a>`,
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
