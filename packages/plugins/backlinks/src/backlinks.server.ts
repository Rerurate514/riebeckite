import type {
  ContentManifest,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
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
  const results = args.manifest.graph.incoming(args.slug).map((entry) => {
    if (!discoverableSlugs.has(entry.slug)) return null;

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
