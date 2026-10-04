import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  type ContentManifestEntry,
} from "@riebeckite/core";
import { formatArchivePeriod } from "./locale.js";
import type { ResolvedArchiveOptions } from "./types.js";

export const ARCHIVE_COLLECTION_KIND = "archive";

export function archiveDefinitions(
  options: ResolvedArchiveOptions,
  locale: string,
): readonly ContentCollectionDefinition[] {
  return [
    {
      kind: ARCHIVE_COLLECTION_KIND,
      basePath: options.basePath,
      groupBy: {
        by: "date",
        fields: ["published", "date", "created"],
        granularity: "month",
      },
      order: "desc",
      pageSize: options.pageSize,
      resolveTitle: ({ value }) => formatArchivePeriod(value, locale),
      resolvePath: ({ value }) =>
        `${options.basePath}/${value.replace(/-/g, "/")}`,
    },
  ];
}

export function buildArchiveCollections(
  entries: readonly ContentManifestEntry[],
  options: ResolvedArchiveOptions,
  locale: string,
): ContentCollection[] {
  if (options.basePath === "") return [];
  return buildContentCollections(entries, archiveDefinitions(options, locale));
}
