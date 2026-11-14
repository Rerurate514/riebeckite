import type { CompletedContentBuildSnapshot } from "../content/content_manager.js";
import {
  adjacency,
  contentNode,
  contentNodeId,
  contentProducerSlug,
  dependencyNode,
  dependencyNodeId,
  describeReason,
  neighbors,
  nodeMatches,
  outputNodeId,
  statusRank,
} from "./graph_part2.js";

export const graphCache = new WeakMap<
  CompletedContentBuildSnapshot,
  GraphIndex
>();

export type GraphQuery = {
  readonly node: string | undefined;
  readonly query: string;
  readonly kind: string | undefined;
  readonly direction: "both" | "in" | "out";
  readonly page: number;
  readonly limit: number;
};

export type GraphNode = {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly detail?: string;
  readonly status?: "affected" | "unchanged" | "removed";
  readonly reason?: string;
  readonly type: "output" | "content" | "dependency";
};

export type GraphEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: "depends-on" | "produces";
};

export type DependencyGraphResult =
  | {
      readonly status: "available";
      readonly summary: {
        readonly outputCount: number;
        readonly contentCount: number;
        readonly dependencyCount: number;
        readonly affectedOutputCount: number;
        readonly unchangedOutputCount: number;
        readonly removedOutputCount: number;
        readonly kinds: readonly {
          readonly kind: string;
          readonly count: number;
        }[];
      };
      readonly selected?: GraphNode;
      readonly nodes: readonly GraphNode[];
      readonly edges: readonly GraphEdge[];
      readonly total: number;
      readonly hidden: number;
      readonly page: number;
      readonly search: boolean;
    }
  | { readonly status: "unavailable"; readonly reason: string };

export function inspectDependencyGraph(
  snapshot: CompletedContentBuildSnapshot,
  query: GraphQuery,
): DependencyGraphResult {
  let graph = graphCache.get(snapshot);
  if (!graph) {
    graph = buildGraph(snapshot);
    graphCache.set(snapshot, graph);
  }
  const matches = query.query
    ? [...graph.nodes.values()].filter((node) =>
        nodeMatches(node, query.query, query.kind),
      )
    : undefined;
  const selected = query.node ? graph.nodes.get(query.node) : undefined;
  const candidates =
    matches ??
    (selected ? neighbors(graph, selected, query) : roots(graph, query));
  const start = query.page * query.limit;
  const page = candidates.slice(start, start + query.limit);
  const visible = new Set(page.map((node) => node.id));
  if (selected) visible.add(selected.id);
  const edges = graph.edges.filter(
    (edge) => visible.has(edge.from) && visible.has(edge.to),
  );
  return {
    status: "available",
    summary: graph.summary,
    selected,
    nodes: page,
    edges,
    total: candidates.length,
    hidden: Math.max(0, candidates.length - start - query.limit),
    page: query.page,
    search: Boolean(matches),
  };
}

export type GraphIndex = {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly edges: readonly GraphEdge[];
  readonly outgoing: ReadonlyMap<string, readonly string[]>;
  readonly incoming: ReadonlyMap<string, readonly string[]>;
  readonly summary: Extract<
    DependencyGraphResult,
    { status: "available" }
  >["summary"];
};

export function buildGraph(
  snapshot: CompletedContentBuildSnapshot,
): GraphIndex {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const kinds = new Map<string, number>();
  const outputs = [
    ...snapshot.outputChangeSet.affected.map((output) => ({
      output,
      status: "affected" as const,
    })),
    ...snapshot.outputChangeSet.unchanged.map((output) => ({
      output,
      status: "unchanged" as const,
    })),
    ...snapshot.outputChangeSet.removed.map((output) => ({
      output,
      status: "removed" as const,
    })),
  ];
  for (const { output, status } of outputs) {
    const reason = snapshot.outputChangeSet.reasons?.get(output.path);
    nodes.set(outputNodeId(output.path), {
      id: outputNodeId(output.path),
      kind: output.kind,
      label: output.path,
      detail: output.producer,
      status,
      reason: reason ? describeReason(reason) : undefined,
      type: "output",
    });
    for (const dependency of output.dependencies) {
      const id = dependencyNodeId(dependency);
      if (!nodes.has(id)) {
        nodes.set(id, dependencyNode(dependency, snapshot));
      }
      edges.push({
        from: outputNodeId(output.path),
        to: id,
        kind: "depends-on",
      });
      kinds.set(dependency.type, (kinds.get(dependency.type) ?? 0) + 1);
    }
    const producer = contentProducerSlug(output);
    if (producer) {
      const id = contentNodeId(producer);
      if (!nodes.has(id)) {
        nodes.set(id, contentNode(producer, snapshot));
      }
      edges.push({ from: id, to: outputNodeId(output.path), kind: "produces" });
    }
  }
  for (const entry of snapshot.manifest.bySlug.values()) {
    const id = contentNodeId(entry.slug);
    if (!nodes.has(id)) nodes.set(id, contentNode(entry.slug, snapshot));
  }
  const outgoing = adjacency(edges, "from");
  const incoming = adjacency(edges, "to");
  const contentCount = [...nodes.values()].filter(
    (node) => node.type === "content",
  ).length;
  const dependencyCount = [...nodes.values()].filter(
    (node) => node.type === "dependency",
  ).length;
  return {
    nodes,
    edges,
    outgoing,
    incoming,
    summary: {
      outputCount: outputs.length,
      contentCount,
      dependencyCount,
      affectedOutputCount: snapshot.outputChangeSet.affectedOutputCount,
      unchangedOutputCount: snapshot.outputChangeSet.unchangedOutputCount,
      removedOutputCount: snapshot.outputChangeSet.removedOutputCount,
      kinds: [...kinds.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([kind, count]) => ({ kind, count })),
    },
  };
}

export function roots(graph: GraphIndex, query: GraphQuery): GraphNode[] {
  return [...graph.nodes.values()]
    .filter((node) => node.type === "output" && node.status !== "removed")
    .filter((node) => !query.kind || node.kind === query.kind)
    .sort(
      (left, right) =>
        statusRank(left) - statusRank(right) ||
        left.label.localeCompare(right.label),
    );
}
