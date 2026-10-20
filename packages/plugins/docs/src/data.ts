import type {
  ContentManifestEntry,
  PluginDataHelper,
  PublicContentView,
} from "@riebeckite/core";
import {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "./navigation.js";
import type {
  DocsNavigationItem,
  DocsNavigationLink,
  DocsOptions,
} from "./types.js";

export const getDocsNavigation: PluginDataHelper<
  {
    view: PublicContentView;
    entries: readonly ContentManifestEntry[];
    entrySlug: string;
    options: DocsOptions;
  },
  readonly DocsNavigationItem[]
> = ({ view, entries, entrySlug, options }) => {
  const entry = view.findRoutableBySlug(entrySlug);
  if (!entry) return [];
  const localized = entries.filter(
    (candidate) =>
      candidate.publishing.discoverable &&
      candidate.publicLocation.language === entry.publicLocation.language,
  );
  return buildDocsNavigation(localized, resolveDocsOptions(options));
};

export const getDocsPrevNext: PluginDataHelper<
  { items: readonly DocsNavigationItem[]; slug: string },
  { readonly previous?: DocsNavigationLink; readonly next?: DocsNavigationLink }
> = ({ items, slug }) => {
  const sequence = flattenDocsNavigation(items);
  const index = sequence.findIndex((item) => item.slug === slug);
  if (index < 0) return {};
  return {
    ...(sequence[index - 1] ? { previous: sequence[index - 1] } : {}),
    ...(sequence[index + 1] ? { next: sequence[index + 1] } : {}),
  };
};
