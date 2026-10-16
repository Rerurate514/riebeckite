import {
  definePlugin,
  escapeHtml,
  type PluginDataHelper,
  type PublicContentEntry,
  type PublicContentView,
  type RiebeckitePlugin,
} from "@riebeckite/core";

export type RelatedPostsOptions = {
  max?: number;
};

type RelatedCandidate = {
  slug: string;
  permalink: string;
  title: string;
  tags: readonly string[];
};

export function findRelatedPosts<T extends RelatedCandidate>(
  entry: RelatedCandidate,
  candidates: readonly T[],
  max: number,
): T[] {
  const tags = new Set(entry.tags);
  if (tags.size === 0) {
    return [];
  }
  return candidates
    .filter(
      (candidate) =>
        candidate.slug !== entry.slug &&
        candidate.tags.some((tag) => tags.has(tag)),
    )
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, max);
}

export function renderRelatedPosts(
  related: readonly RelatedCandidate[],
): string {
  if (related.length === 0) {
    return "";
  }
  const items = related
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.permalink)}" data-rr-related>${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  return `<section class="rr-related-posts"><h2>Related</h2><ul>${items}</ul></section>`;
}

export const getRelatedPosts: PluginDataHelper<
  {
    view: PublicContentView;
    entry: PublicContentEntry;
    options?: RelatedPostsOptions;
  },
  readonly PublicContentEntry[]
> = ({ view, entry, options }) => {
  const isDiscoverable = view.discoverableEntries.some(
    (candidate) => candidate.slug === entry.slug,
  );
  if (!isDiscoverable) {
    return [];
  }
  return findRelatedPosts(entry, view.discoverableEntries, options?.max ?? 3);
};

export function relatedPostsPlugin(
  options: RelatedPostsOptions = {},
): RiebeckitePlugin<RelatedPostsOptions> {
  return definePlugin({
    name: "plugin-dx-related-posts",
    options,
  });
}
