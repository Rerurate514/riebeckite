import type {
  CompletedContentBuildSnapshot,
  OutputChangeReason,
  OutputDependency,
  OutputDescriptor,
} from "@riebeckite/core";

const maximumGraphLimit = 100;
const defaultGraphLimit = 40;
const graphCache = new WeakMap<CompletedContentBuildSnapshot, GraphIndex>();

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

export function graphQueryFromRequest(url: string | undefined): GraphQuery {
  const parameters = new URL(
    url ?? "/__riebeckite/inspector/graph",
    "http://localhost",
  ).searchParams;
  return {
    node: parameters.get("node") ?? undefined,
    query: parameters.get("q") ?? "",
    kind: parameters.get("kind") ?? undefined,
    direction:
      parameters.get("direction") === "in" ||
      parameters.get("direction") === "out"
        ? (parameters.get("direction") as "in" | "out")
        : "both",
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: Math.min(
      maximumGraphLimit,
      Math.max(
        1,
        nonNegativeInteger(parameters.get("limit"), defaultGraphLimit),
      ),
    ),
  };
}

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

type GraphIndex = {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly edges: readonly GraphEdge[];
  readonly outgoing: ReadonlyMap<string, readonly string[]>;
  readonly incoming: ReadonlyMap<string, readonly string[]>;
  readonly summary: Extract<
    DependencyGraphResult,
    { status: "available" }
  >["summary"];
};

function buildGraph(snapshot: CompletedContentBuildSnapshot): GraphIndex {
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

function roots(graph: GraphIndex, query: GraphQuery): GraphNode[] {
  return [...graph.nodes.values()]
    .filter((node) => node.type === "output" && node.status !== "removed")
    .filter((node) => !query.kind || node.kind === query.kind)
    .sort(
      (left, right) =>
        statusRank(left) - statusRank(right) ||
        left.label.localeCompare(right.label),
    );
}

function neighbors(
  graph: GraphIndex,
  selected: GraphNode,
  query: GraphQuery,
): GraphNode[] {
  const ids =
    query.direction === "out"
      ? (graph.outgoing.get(selected.id) ?? [])
      : query.direction === "in"
        ? (graph.incoming.get(selected.id) ?? [])
        : [
            ...(graph.outgoing.get(selected.id) ?? []),
            ...(graph.incoming.get(selected.id) ?? []),
          ];
  const seen = new Set<string>();
  return ids
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => graph.nodes.get(id))
    .filter((node): node is GraphNode => node !== undefined)
    .filter((node) => !query.kind || node.kind === query.kind)
    .sort(
      (left, right) =>
        statusRank(left) - statusRank(right) ||
        left.label.localeCompare(right.label),
    );
}

function nodeMatches(node: GraphNode, query: string, kind: string | undefined) {
  if (kind && node.kind !== kind) return false;
  const needle = query.toLowerCase();
  return [node.id, node.kind, node.label, node.detail, node.reason].some(
    (value) => value?.toLowerCase().includes(needle),
  );
}

function dependencyNode(
  dependency: OutputDependency,
  snapshot: CompletedContentBuildSnapshot,
): GraphNode {
  if (dependency.type === "content")
    return contentNode(dependency.slug, snapshot);
  const label = dependencyLabel(dependency);
  return {
    id: dependencyNodeId(dependency),
    kind: dependency.type,
    label,
    type: "dependency",
  };
}

function contentNode(
  slug: string,
  snapshot: CompletedContentBuildSnapshot,
): GraphNode {
  const entry = snapshot.manifest.bySlug.get(slug);
  return {
    id: contentNodeId(slug),
    kind: "content",
    label: slug,
    detail: entry?.title,
    type: "content",
  };
}

function outputNodeId(path: string): string {
  return `output:${path}`;
}

function contentNodeId(slug: string): string {
  return `content:${slug}`;
}

function dependencyNodeId(dependency: OutputDependency): string {
  return dependency.type === "content"
    ? contentNodeId(dependency.slug)
    : `dependency:${dependencyLabel(dependency)}`;
}

function contentProducerSlug(output: OutputDescriptor): string | undefined {
  if (!output.producer.startsWith("content:")) return undefined;
  return output.producer.slice("content:".length).replace(/:redirect$/, "");
}

function dependencyLabel(dependency: OutputDependency): string {
  switch (dependency.type) {
    case "content":
      return `content:${dependency.slug}`;
    case "tag":
      return `tag:${dependency.tag}`;
    case "folder":
      return `folder:${dependency.folder}`;
    case "file":
      return `file:${dependency.path}`;
    case "public-location":
      return `public-location:${dependency.pathname}`;
    case "projection":
      return `projection:${dependency.projection}`;
    case "external":
      return `external:${dependency.id}`;
    case "derived-view":
      return `derived-view:${dependency.id}@${dependency.version}`;
    case "content-query":
      return `content-query:${dependency.properties.join(",")}${
        dependency.unknown ? "?" : ""
      }`;
    case "global":
      return "global";
    case "unknown":
      return "unknown";
  }
}

function describeReason(reason: OutputChangeReason): string {
  switch (reason.type) {
    case "new-output":
      return "new output";
    case "kind-changed":
      return `output kind changed from ${reason.previousKind}`;
    case "unknown-dependency":
      return "unknown dependency";
    case "external":
      return `external:${reason.id} changed`;
    case "derived-view":
      return `derived-view:${reason.id} changed`;
    case "global":
      return "global dependency changed";
    case "content":
      return `content:${reason.slug} changed`;
    case "tag":
      return `tag:${reason.tag} changed`;
    case "folder":
      return `folder:${reason.folder} changed`;
    case "file":
      return `file:${reason.path} changed`;
    case "public-location":
      return `public-location:${reason.pathname} changed`;
    case "content-query":
      return `content-query:${reason.properties.join(",")}${
        reason.unknown ? "?" : ""
      } changed`;
    case "projection":
      return `projection:${reason.projection} changed`;
  }
}

function adjacency(
  edges: readonly GraphEdge[],
  key: "from" | "to",
): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, string[]>();
  for (const edge of edges) {
    const source = edge[key];
    const target = key === "from" ? edge.to : edge.from;
    const values = result.get(source) ?? [];
    values.push(target);
    result.set(source, values);
  }
  return result;
}

function statusRank(node: GraphNode): number {
  return node.status === "affected" ? 0 : node.status === "unchanged" ? 1 : 2;
}

function nonNegativeInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
