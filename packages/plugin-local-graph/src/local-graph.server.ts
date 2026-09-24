import {
  type ContentManifest,
  isPublished,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { LocalGraphData, LocalGraphNode } from "../components/local-graph";

const MAX_NEIGHBORS_PER_DIRECTION = 10;

type TitleResolver = (slug: string, title: unknown) => string;

export function getLocalGraph(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  slug: string;
  resolveTitle: TitleResolver;
}): LocalGraphData | null {
  const current = args.manifest.bySlug.get(args.slug);
  if (!current || !isPublished(args.config, current.frontmatter)) return null;

  const outgoing = current.links
    .filter(
      (link): link is typeof link & { slug: string } =>
        link.kind === "note" &&
        link.slug !== null &&
        link.slug !== args.slug &&
        isPublishedSlug(link.slug),
    )
    .map((link) => link.slug);
  const backlinks = current.backlinks.filter(
    (backlinkSlug) =>
      backlinkSlug !== args.slug && isPublishedSlug(backlinkSlug),
  );
  const visibleOutgoing = uniqueStrings(outgoing).slice(
    0,
    MAX_NEIGHBORS_PER_DIRECTION,
  );
  const visibleBacklinks = uniqueStrings(backlinks).slice(
    0,
    MAX_NEIGHBORS_PER_DIRECTION,
  );
  const visibleSlugs = new Set([
    args.slug,
    ...visibleOutgoing,
    ...visibleBacklinks,
  ]);
  const nodes = Array.from(visibleSlugs)
    .map((nodeSlug) =>
      toLocalGraphNode(nodeSlug, args.slug, visibleOutgoing, visibleBacklinks),
    )
    .filter((node): node is LocalGraphNode => node !== null);

  return { currentSlug: args.slug, nodes };

  function isPublishedSlug(nodeSlug: string): boolean {
    const entry = args.manifest.bySlug.get(nodeSlug);
    return entry !== undefined && isPublished(args.config, entry.frontmatter);
  }

  function toLocalGraphNode(
    nodeSlug: string,
    currentSlug: string,
    outgoingSlugs: string[],
    backlinkSlugs: string[],
  ): LocalGraphNode | null {
    const entry = args.manifest.bySlug.get(nodeSlug);
    if (!entry) return null;

    return {
      slug: entry.slug,
      title: args.resolveTitle(entry.slug, entry.frontmatter.title),
      relation: getRelation(
        nodeSlug,
        currentSlug,
        outgoingSlugs,
        backlinkSlugs,
      ),
      outgoing:
        nodeSlug === currentSlug
          ? outgoingSlugs
          : backlinkSlugs.includes(nodeSlug)
            ? [currentSlug]
            : [],
      backlinks:
        nodeSlug === currentSlug
          ? backlinkSlugs
          : outgoingSlugs.includes(nodeSlug)
            ? [currentSlug]
            : [],
    };
  }
}

function getRelation(
  slug: string,
  currentSlug: string,
  outgoing: string[],
  backlinks: string[],
): LocalGraphNode["relation"] {
  if (slug === currentSlug) return "current";
  const isOutgoing = outgoing.includes(slug);
  const isBacklink = backlinks.includes(slug);
  if (isOutgoing && isBacklink) return "both";
  return isOutgoing ? "outgoing" : "backlink";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
