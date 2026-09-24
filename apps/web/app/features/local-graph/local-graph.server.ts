import { isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import type { LocalGraphData, LocalGraphNode } from "./local-graph";

const MAX_NEIGHBORS_PER_DIRECTION = 10;

export async function getLocalGraph(
  slug: string,
): Promise<LocalGraphData | null> {
  const manifest = await content.getManifest();
  const current = manifest.bySlug.get(slug);
  if (!current || !isPublished(config, current.frontmatter)) return null;

  const outgoing = current.links
    .filter(
      (link): link is typeof link & { slug: string } =>
        link.kind === "note" &&
        link.slug !== null &&
        link.slug !== slug &&
        isPublishedSlug(link.slug),
    )
    .map((link) => link.slug);
  const backlinks = current.backlinks.filter(
    (backlinkSlug) => backlinkSlug !== slug && isPublishedSlug(backlinkSlug),
  );
  const visibleOutgoing = uniqueStrings(outgoing).slice(
    0,
    MAX_NEIGHBORS_PER_DIRECTION,
  );
  const visibleBacklinks = uniqueStrings(backlinks).slice(
    0,
    MAX_NEIGHBORS_PER_DIRECTION,
  );
  const visibleSlugs = new Set([slug, ...visibleOutgoing, ...visibleBacklinks]);
  const nodes = Array.from(visibleSlugs)
    .map((nodeSlug) =>
      toLocalGraphNode(nodeSlug, slug, visibleOutgoing, visibleBacklinks),
    )
    .filter((node): node is LocalGraphNode => node !== null);

  return { currentSlug: slug, nodes };

  function isPublishedSlug(nodeSlug: string): boolean {
    const entry = manifest.bySlug.get(nodeSlug);
    return entry !== undefined && isPublished(config, entry.frontmatter);
  }

  function toLocalGraphNode(
    nodeSlug: string,
    currentSlug: string,
    outgoingSlugs: string[],
    backlinkSlugs: string[],
  ): LocalGraphNode | null {
    const entry = manifest.bySlug.get(nodeSlug);
    if (!entry) return null;

    return {
      slug: entry.slug,
      title: getArticleTitle(entry.slug, entry.frontmatter.title),
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
