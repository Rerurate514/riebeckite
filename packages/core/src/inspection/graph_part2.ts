import type { CompletedContentBuildSnapshot } from "../content/content_manager.js";
import type {
  OutputChangeReason,
  OutputDescriptor,
} from "../content/output_dependency.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type {
  GraphEdge,
  GraphIndex,
  GraphNode,
  GraphQuery,
} from "./graph_part1.js";

export function neighbors(
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

export function nodeMatches(
  node: GraphNode,
  query: string,
  kind: string | undefined,
) {
  if (kind && node.kind !== kind) return false;
  const needle = query.toLowerCase();
  return [node.id, node.kind, node.label, node.detail, node.reason].some(
    (value) => value?.toLowerCase().includes(needle),
  );
}

export function dependencyNode(
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

export function contentNode(
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

export function outputNodeId(path: string): string {
  return `output:${path}`;
}

export function contentNodeId(slug: string): string {
  return `content:${slug}`;
}

export function dependencyNodeId(dependency: OutputDependency): string {
  return dependency.type === "content"
    ? contentNodeId(dependency.slug)
    : `dependency:${dependencyLabel(dependency)}`;
}

export function contentProducerSlug(
  output: OutputDescriptor,
): string | undefined {
  if (!output.producer.startsWith("content:")) return undefined;
  return output.producer.slice("content:".length).replace(/:redirect$/, "");
}

export function dependencyLabel(dependency: OutputDependency): string {
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
    case "derived-query":
      return `derived-query:${dependency.id}@${dependency.fingerprint.slice(0, 8)}`;
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

export function describeReason(reason: OutputChangeReason): string {
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
    case "derived-query":
      return `derived-query:${reason.id} changed`;
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

export function adjacency(
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

export function statusRank(node: GraphNode): number {
  return node.status === "affected" ? 0 : node.status === "unchanged" ? 1 : 2;
}
