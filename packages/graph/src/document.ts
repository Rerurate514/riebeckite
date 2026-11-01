import { normalizeGraphText } from "./query.js";
import type { GraphDocument, GraphLink, GraphNode } from "./types.js";

export type GraphSourceLink = {
  raw: string;
  slug: string | null;
  kind: string;
};

export type GraphSourceAsset = {
  path: string;
  sourcePath?: string;
};

export type GraphSourceEntry = {
  slug: string;
  title: string;
  permalink: string;
  tags?: readonly string[];
  links?: readonly GraphSourceLink[];
  assets?: readonly GraphSourceAsset[];
  date?: string | null;
};

export type BuildGraphDocumentOptions = {
  centerSlug?: string | null;
  includeTags?: boolean;
  includeAttachments?: boolean;
  includeUnresolved?: boolean;
};

export function buildGraphDocument(
  entries: readonly GraphSourceEntry[],
  options: BuildGraphDocumentOptions = {},
): GraphDocument {
  const includeTags = options.includeTags ?? true;
  const includeAttachments = options.includeAttachments ?? true;
  const includeUnresolved = options.includeUnresolved ?? true;
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const nodes = new Map<string, GraphNode>();
  const links = new Map<string, GraphLink>();

  for (const entry of entries) {
    nodes.set(entry.slug, {
      id: entry.slug,
      kind: "note",
      slug: entry.slug,
      title: entry.title,
      permalink: entry.permalink,
      path: entry.slug,
      tags: uniqueTags(entry.tags ?? []),
      date: normalizeDate(entry.date ?? null),
    });
  }

  for (const entry of entries) {
    for (const tag of uniqueTags(entry.tags ?? [])) {
      if (!includeTags) break;
      const id = `tag:${normalizeGraphText(tag)}`;
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          kind: "tag",
          slug: null,
          title: `#${tag}`,
          permalink: null,
          path: `#${tag}`,
          tags: [tag],
          date: null,
        });
      }
      addLink(links, entry.slug, id);
    }

    const assets = uniqueAssets(entry.assets ?? []);
    for (const link of entry.links ?? []) {
      if (link.kind === "note" && link.slug !== null) {
        if (entryBySlug.has(link.slug) && link.slug !== entry.slug) {
          addLink(links, entry.slug, link.slug);
        }
        continue;
      }

      if (
        (link.kind === "attachment" || link.kind === "image") &&
        includeAttachments
      ) {
        const asset = findAsset(assets, link.raw);
        if (!asset) continue;
        const id = `attachment:${asset.path}`;
        if (!nodes.has(id)) {
          nodes.set(id, {
            id,
            kind: "attachment",
            slug: null,
            title: basename(asset.path),
            permalink: null,
            path: asset.path,
            tags: [],
            date: null,
          });
        }
        addLink(links, entry.slug, id);
        continue;
      }

      if (includeUnresolved && link.raw.trim().length > 0) {
        const key = normalizeGraphText(link.raw);
        const id = `unresolved:${key}`;
        if (!nodes.has(id)) {
          nodes.set(id, {
            id,
            kind: "unresolved",
            slug: null,
            title: link.raw,
            permalink: null,
            path: link.raw,
            tags: [],
            date: null,
          });
        }
        addLink(links, entry.slug, id);
      }
    }
  }

  const nodeList = [...nodes.values()].sort(compareNode);
  const centerId =
    options.centerSlug && entryBySlug.has(options.centerSlug)
      ? options.centerSlug
      : (entries[0]?.slug ?? null);

  return {
    nodes: nodeList,
    links: [...links.values()].sort(
      (left, right) =>
        left.source.localeCompare(right.source) ||
        left.target.localeCompare(right.target),
    ),
    centerId,
  };
}

export type SliceGraphDocumentResult = {
  document: GraphDocument;
  truncated: boolean;
};

export function sliceGraphDocument(
  document: GraphDocument,
  centerId: string,
  depth: number,
  maxNodes = 320,
): SliceGraphDocumentResult {
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  if (!nodeById.has(centerId)) {
    return {
      document: { nodes: [], links: [], centerId: null },
      truncated: false,
    };
  }

  const adjacency = new Map<string, string[]>();
  for (const node of document.nodes) adjacency.set(node.id, []);
  for (const link of document.links) {
    adjacency.get(link.source)?.push(link.target);
    adjacency.get(link.target)?.push(link.source);
  }
  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => left.localeCompare(right));
  }

  const selected = new Set<string>([centerId]);
  const limit = Math.max(1, Math.floor(maxNodes));
  let frontier = [centerId];
  let truncated = false;

  for (let level = 0; level < Math.max(0, depth); level += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (selected.has(neighbor)) continue;
        if (selected.size >= limit) {
          truncated = true;
          break;
        }
        selected.add(neighbor);
        next.push(neighbor);
      }
      if (truncated) break;
    }
    if (truncated || next.length === 0) break;
    frontier = next;
  }

  const nodes = document.nodes
    .filter((node) => selected.has(node.id))
    .sort(compareNode);
  const links = document.links.filter(
    (link) => selected.has(link.source) && selected.has(link.target),
  );
  return {
    document: { nodes, links, centerId },
    truncated,
  };
}

function addLink(
  links: Map<string, GraphLink>,
  source: string,
  target: string,
): void {
  if (source === target) return;
  links.set(`${source}\0${target}`, { source, target });
}

function compareNode(left: GraphNode, right: GraphNode): number {
  return (
    kindOrder(left.kind) - kindOrder(right.kind) ||
    left.id.localeCompare(right.id)
  );
}

function kindOrder(kind: GraphNode["kind"]): number {
  switch (kind) {
    case "note":
      return 0;
    case "unresolved":
      return 1;
    case "attachment":
      return 2;
    case "tag":
      return 3;
  }
}

function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "");
    if (tag.length === 0) continue;
    const key = normalizeGraphText(tag);
    if (!seen.has(key)) seen.set(key, tag);
  }
  return [...seen.values()].sort((left, right) => left.localeCompare(right));
}

function uniqueAssets(assets: readonly GraphSourceAsset[]): GraphSourceAsset[] {
  const seen = new Map<string, GraphSourceAsset>();
  for (const asset of assets) {
    seen.set(asset.path, asset);
  }
  return [...seen.values()];
}

function findAsset(
  assets: readonly GraphSourceAsset[],
  raw: string,
): GraphSourceAsset | null {
  const value = raw.replace(/^\.\//, "");
  return (
    assets.find(
      (asset) => asset.path === value || asset.sourcePath === value,
    ) ??
    assets.find(
      (asset) =>
        asset.path.endsWith(`/${value}`) ||
        asset.sourcePath?.endsWith(`/${value}`) === true,
    ) ??
    null
  );
}

function basename(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
