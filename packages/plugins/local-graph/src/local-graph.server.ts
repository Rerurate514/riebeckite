import type {
  ContentManifest,
  ContentManifestEntry,
  PluginDataHelper,
  PublicContentEntry,
  PublicContentView,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveEntryDate } from "@riebeckite/core";
import {
  buildGraphDocument,
  type GraphSourceEntry,
  sliceGraphDocument,
} from "@riebeckite/graph";
import type { LocalGraphData, LocalGraphNode } from "./local-graph.js";

const LOCAL_GRAPH_DEPTH = 3;
const LOCAL_GRAPH_MAX_NODES = 320;

type TitleResolver = (slug: string, title: unknown) => string;

export function buildLocalGraph(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  slug: string;
  resolveTitle: TitleResolver;
}): LocalGraphData | null {
  const current = args.manifest.discoverableEntries.find(
    (entry) => entry.slug === args.slug,
  );
  if (!current) return null;
  const document = buildGraphDocument(
    args.manifest.discoverableEntries.map((entry) =>
      toManifestSource(entry, args.resolveTitle),
    ),
    { centerSlug: args.slug },
  );
  return createLocalGraphData(
    args.slug,
    sliceGraphDocument(
      document,
      args.slug,
      LOCAL_GRAPH_DEPTH,
      LOCAL_GRAPH_MAX_NODES,
    ),
    args.manifest.graph,
    args.resolveTitle,
  );
}

export const getLocalGraph: PluginDataHelper<
  { view: PublicContentView; slug: string },
  LocalGraphData | null
> = ({ view, slug }) => {
  const current = view.findDiscoverableBySlug(slug);
  if (!current) return null;
  const document = buildGraphDocument(
    view.discoverableEntries.map(toPublicSource),
    { centerSlug: slug },
  );
  const sliced = sliceGraphDocument(
    document,
    slug,
    LOCAL_GRAPH_DEPTH,
    LOCAL_GRAPH_MAX_NODES,
  );
  return createLocalGraphData(
    slug,
    sliced,
    {
      filterNeighbors(_nodeSlug, isVisible) {
        const outgoing = current.links
          .filter(
            (link) =>
              link.kind === "note" &&
              link.slug !== null &&
              isVisible(link.slug),
          )
          .map((link) => link.slug as string);
        const incoming = view
          .getDiscoverableIncoming(slug)
          .map((entry) => entry.slug);
        return { outgoingSlugs: outgoing, incomingSlugs: incoming };
      },
      get(nodeSlug) {
        const entry = view.findDiscoverableBySlug(nodeSlug);
        return entry
          ? {
              slug: entry.slug,
              permalink: entry.permalink,
              frontmatter: { title: entry.title },
            }
          : null;
      },
    },
    (nodeSlug, title) => {
      const entry = view.findDiscoverableBySlug(nodeSlug);
      return entry?.title || (typeof title === "string" ? title : nodeSlug);
    },
  );
};

export function createLocalGraphData(
  currentSlug: string,
  sliced: {
    document: NonNullable<LocalGraphData["document"]>;
    truncated: boolean;
  },
  graph: {
    filterNeighbors(
      slug: string,
      isVisible: (slug: string) => boolean,
    ): { outgoingSlugs: string[]; incomingSlugs: string[] };
    get(slug: string): {
      slug: string;
      permalink: string;
      frontmatter: { title?: unknown };
    } | null;
  },
  resolveTitle: TitleResolver,
): LocalGraphData {
  const { document } = sliced;
  const discoverableSlugs = new Set(
    document.nodes
      .filter((node) => node.kind === "note" && node.slug)
      .map((node) => node.slug as string),
  );
  const { outgoingSlugs, incomingSlugs } = graph.filterNeighbors(
    currentSlug,
    (slug) => discoverableSlugs.has(slug),
  );
  const nodeSlugs = new Set([currentSlug, ...outgoingSlugs, ...incomingSlugs]);
  const nodes = [...nodeSlugs]
    .map((slug) =>
      toLocalGraphNode(
        slug,
        currentSlug,
        outgoingSlugs,
        incomingSlugs,
        graph,
        resolveTitle,
      ),
    )
    .filter((node): node is LocalGraphNode => node !== null)
    .sort((left, right) => left.slug.localeCompare(right.slug));

  return {
    currentSlug,
    nodes,
    document,
    truncated: sliced.truncated,
  };
}

function toLocalGraphNode(
  slug: string,
  currentSlug: string,
  outgoingSlugs: string[],
  incomingSlugs: string[],
  graph: {
    get(slug: string): {
      slug: string;
      permalink: string;
      frontmatter: { title?: unknown };
    } | null;
  },
  resolveTitle: TitleResolver,
): LocalGraphNode | null {
  const entry = graph.get(slug);
  if (!entry) return null;
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: resolveTitle(entry.slug, entry.frontmatter.title),
    relation: getRelation(slug, currentSlug, outgoingSlugs, incomingSlugs),
    outgoing:
      slug === currentSlug
        ? outgoingSlugs
        : incomingSlugs.includes(slug)
          ? [currentSlug]
          : [],
    backlinks:
      slug === currentSlug
        ? incomingSlugs
        : outgoingSlugs.includes(slug)
          ? [currentSlug]
          : [],
  };
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

function toManifestSource(
  entry: ContentManifestEntry,
  resolveTitle: TitleResolver,
): GraphSourceEntry {
  return {
    slug: entry.slug,
    title: resolveTitle(entry.slug, entry.frontmatter.title),
    permalink: entry.permalink,
    tags: entry.tags,
    links: entry.links,
    assets: entry.assets,
    date: resolveEntryDate(entry.frontmatter),
  };
}

function toPublicSource(entry: PublicContentEntry): GraphSourceEntry {
  return {
    slug: entry.slug,
    title: entry.title,
    permalink: entry.permalink,
    tags: entry.tags,
    links: entry.links,
    assets: entry.assets,
    date: entry.date ?? null,
  };
}
