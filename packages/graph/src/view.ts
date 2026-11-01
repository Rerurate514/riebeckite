import { matchesGraphQuery, parseGraphQuery } from "./query.js";
import type {
  GraphDocument,
  GraphGroup,
  GraphMode,
  GraphNode,
  GraphSettings,
  VisibleGraph,
  VisibleGraphNode,
} from "./types.js";

export type BuildVisibleGraphInput = {
  document: GraphDocument;
  settings: GraphSettings;
  mode: GraphMode;
  centerId?: string | null;
};

export function buildVisibleGraph(input: BuildVisibleGraphInput): VisibleGraph {
  const { document, settings, mode } = input;
  const centerId = input.centerId ?? document.centerId;
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(document);
  const fullDegree = new Map<string, number>();
  for (const link of document.links) {
    fullDegree.set(link.source, (fullDegree.get(link.source) ?? 0) + 1);
    fullDegree.set(link.target, (fullDegree.get(link.target) ?? 0) + 1);
  }

  const search = parseGraphQuery(settings.search);
  const groups = settings.groups.map((group) => ({
    group,
    query: parseGraphQuery(group.query),
  }));
  const unsupportedOperators = new Set(search.unsupportedOperators);
  for (const entry of groups) {
    for (const operator of entry.query.unsupportedOperators) {
      unsupportedOperators.add(operator);
    }
  }

  const candidates =
    mode === "local"
      ? collectLocalNodeIds(adjacency, centerId, settings.depth)
      : new Set(document.nodes.map((node) => node.id));

  const visibleNodes: VisibleGraphNode[] = [];
  for (const id of candidates) {
    const node = nodeById.get(id);
    if (!node) continue;
    if (node.kind === "tag" && !settings.showTags) continue;
    if (node.kind === "attachment" && !settings.showAttachments) continue;
    if (node.kind === "unresolved" && settings.existingOnly) continue;
    if (
      node.kind === "note" &&
      !settings.showOrphans &&
      (fullDegree.get(node.id) ?? 0) === 0
    ) {
      continue;
    }
    if (settings.search.trim().length > 0 && !matchesGraphQuery(node, search)) {
      if (mode !== "local" || id !== centerId) continue;
    }

    visibleNodes.push({
      ...node,
      degree: 0,
      radius: 0,
      color: "",
      groupId: null,
    });
  }

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const links = document.links.filter(
    (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
  );
  const degree = new Map<string, number>();
  for (const link of links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }

  visibleNodes.sort((left, right) => left.id.localeCompare(right.id));
  for (const node of visibleNodes) {
    node.degree = degree.get(node.id) ?? 0;
    node.radius = 3 + Math.sqrt(node.degree) * 1.7;
    const group = findGroup(node, groups);
    node.groupId = group?.group.id ?? null;
    node.color = group?.group.color ?? "";
  }

  return {
    nodes: visibleNodes,
    links,
    centerId: centerId && visibleIds.has(centerId) ? centerId : null,
    unsupportedOperators: [...unsupportedOperators],
  };
}

export function collectLocalNodeIds(
  adjacency: ReadonlyMap<string, readonly string[]>,
  centerId: string | null,
  depth: number,
): Set<string> {
  const ids = new Set<string>();
  if (!centerId) return ids;
  ids.add(centerId);
  let frontier = [centerId];

  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (ids.has(neighbor)) continue;
        ids.add(neighbor);
        next.push(neighbor);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }

  return ids;
}

function buildAdjacency(document: GraphDocument): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of document.nodes) adjacency.set(node.id, []);
  for (const link of document.links) {
    adjacency.get(link.source)?.push(link.target);
    adjacency.get(link.target)?.push(link.source);
  }
  return adjacency;
}

function findGroup(
  node: GraphNode,
  groups: readonly {
    group: GraphGroup;
    query: ReturnType<typeof parseGraphQuery>;
  }[],
): { group: GraphGroup } | null {
  for (const entry of groups) {
    if (entry.group.query.trim().length === 0) continue;
    if (entry.query.unsupportedOperators.length > 0) continue;
    if (matchesGraphQuery(node, entry.query)) return entry;
  }
  return null;
}
