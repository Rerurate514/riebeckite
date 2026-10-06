import {
  appendContentBodySlot,
  type ContentManifestEntry,
  definePlugin,
  escapeHtml,
  type RiebeckitePlugin,
} from "@riebeckite/core";

export type RelatedPostsOptions = {
  max?: number;
  slot?: string;
};

export function findRelatedPosts(
  entry: ContentManifestEntry,
  entries: readonly ContentManifestEntry[],
  max: number,
): ContentManifestEntry[] {
  const tags = new Set(entry.tags);
  if (tags.size === 0) {
    return [];
  }
  return entries
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
  related: readonly ContentManifestEntry[],
): string {
  const items = related
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.permalink)}" data-rr-related>${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  return `<section class="rr-related-posts"><h2>Related</h2><ul>${items}</ul></section>`;
}

export function relatedPostsPlugin(
  options: RelatedPostsOptions = {},
): RiebeckitePlugin<RelatedPostsOptions> {
  const max = options.max ?? 3;
  const slot = options.slot ?? "article.footer";
  return definePlugin({
    name: "plugin-dx-related-posts",
    options,
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.discoverableEntries) {
        const related = findRelatedPosts(
          entry,
          manifest.discoverableEntries,
          max,
        );
        if (related.length === 0) {
          continue;
        }
        appendContentBodySlot(entry, slot, renderRelatedPosts(related));
      }
    },
  });
}
