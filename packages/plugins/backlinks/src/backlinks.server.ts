import type {
  ContentManifest,
  PluginDataHelper,
  PublicContentView,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { selectLocalizedEntries } from "@riebeckite/core";
import type { ArticleBacklink } from "./backlinks.js";

type TitleResolver = (slug: string, title: unknown) => string;

export function getPublishedBacklinks(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  slug: string;
  resolveTitle: TitleResolver;
}): ArticleBacklink[] {
  const discoverableSlugs = new Set(
    args.manifest.discoverableEntries.map((entry) => entry.slug),
  );
  const current = args.manifest.bySlug.get(args.slug);
  const allowed = current
    ? new Set(
        selectLocalizedEntries(args.manifest.discoverableEntries, {
          mode: "current",
          locale: current.publicLocation.language,
          ...(args.manifest.localization?.fallbackLocale
            ? { fallbackLocale: args.manifest.localization.fallbackLocale }
            : {}),
        }).map((entry) => entry.slug),
      )
    : discoverableSlugs;
  const results = args.manifest.graph.incoming(args.slug).map((entry) => {
    if (!discoverableSlugs.has(entry.slug)) return null;
    if (!allowed.has(entry.slug)) return null;

    return {
      slug: entry.slug,
      permalink: entry.permalink,
      title: args.resolveTitle(entry.slug, entry.frontmatter.title),
    };
  });

  return results.filter(
    (backlink): backlink is ArticleBacklink => backlink !== null,
  );
}

export const getBacklinks: PluginDataHelper<
  { view: PublicContentView; slug: string },
  readonly ArticleBacklink[]
> = ({ view, slug }) => {
  const current = view.findDiscoverableBySlug(slug);
  const allowed = current
    ? new Set(
        selectLocalizedEntries(view.discoverableEntries, {
          mode: "current",
          locale: current.publicLocation.language,
          ...(view.localization?.fallbackLocale
            ? { fallbackLocale: view.localization.fallbackLocale }
            : {}),
        }).map((entry) => entry.slug),
      )
    : null;
  return view
    .getDiscoverableIncoming(slug)
    .filter((entry) => allowed === null || allowed.has(entry.slug))
    .map((entry) => ({
      slug: entry.slug,
      permalink: entry.permalink,
      title: entry.title || entry.slug,
    }));
};
