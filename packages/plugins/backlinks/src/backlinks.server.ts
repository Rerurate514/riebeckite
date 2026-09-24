import {
  type ContentManifest,
  isPublished,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { ArticleBacklink } from "../components/backlinks";

type TitleResolver = (slug: string, title: unknown) => string;

export function getPublishedBacklinks(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  slug: string;
  resolveTitle: TitleResolver;
}): ArticleBacklink[] {
  const backlinkSlugs = args.manifest.incomingLinks.get(args.slug) ?? [];
  const results = backlinkSlugs.map((backlinkSlug) => {
    const entry = args.manifest.bySlug.get(backlinkSlug);
    if (!entry || !isPublished(args.config, entry.frontmatter)) return null;

    return {
      slug: entry.slug,
      title: args.resolveTitle(entry.slug, entry.frontmatter.title),
    };
  });

  return results.filter(
    (backlink): backlink is ArticleBacklink => backlink !== null,
  );
}
