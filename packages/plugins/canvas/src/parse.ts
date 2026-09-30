import type {
  CanvasDocument,
  CanvasEdge,
  CanvasEdgeSide,
  CanvasLayout,
  CanvasLayoutEdge,
  CanvasLayoutNode,
  CanvasNode,
  CanvasNodeType,
  CanvasOptions,
  CanvasRenderMode,
  ResolvedCanvasOptions,
} from "./types.js";

const NODE_TYPES: readonly CanvasNodeType[] = ["text", "file", "link", "group"];
const EDGE_SIDES: readonly CanvasEdgeSide[] = [
  "top",
  "right",
  "bottom",
  "left",
];
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;
const FALLBACK_COLUMNS = 3;
const FALLBACK_COLUMN_GAP = 260;
const FALLBACK_ROW_GAP = 180;

/**
 * Parse a JSON Canvas 1.0 document. Returns `null` when the payload is not
 * valid JSON or does not describe a canvas (`nodes`/`edges` arrays).
 */
export function parseCanvas(json: string): CanvasDocument | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isRecord(value)) return null;

  const nodes = parseNodes(value.nodes);
  const edges = parseEdges(value.edges);
  if (nodes === null || edges === null) return null;

  return { nodes, edges };
}

/**
 * Normalise a parsed canvas into absolute, non-negative coordinates and
 * resolve edge endpoints to line segments. Pure: it never touches the DOM.
 */
export function buildCanvasLayout(doc: CanvasDocument): CanvasLayout {
  const positioned = doc.nodes.map((node, index) => normalizeNode(node, index));
  const minX = positioned.length
    ? Math.min(...positioned.map((node) => node.x))
    : 0;
  const minY = positioned.length
    ? Math.min(...positioned.map((node) => node.y))
    : 0;

  const nodes: CanvasLayoutNode[] = positioned.map((node) => ({
    ...node,
    x: node.x - minX,
    y: node.y - minY,
    centerX: node.x - minX + node.width / 2,
    centerY: node.y - minY + node.height / 2,
  }));

  const width = nodes.length
    ? Math.max(...nodes.map((node) => node.x + node.width))
    : 0;
  const height = nodes.length
    ? Math.max(...nodes.map((node) => node.y + node.height))
    : 0;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: CanvasLayoutEdge[] = [];
  for (const edge of doc.edges) {
    const from = byId.get(edge.fromNode);
    const to = byId.get(edge.toNode);
    if (!from || !to) continue;
    edges.push({
      ...edge,
      x1: from.centerX,
      y1: from.centerY,
      x2: to.centerX,
      y2: to.centerY,
    });
  }

  return { width, height, nodes, edges };
}

export function resolveCanvasOptions(
  options: CanvasOptions = {},
): ResolvedCanvasOptions {
  return {
    className: options.className?.trim() || "rb-canvas",
    language: options.language?.trim() || "canvas",
    render: isRenderMode(options.render) ? options.render : "both",
    height: options.height,
    maxNodes: options.maxNodes,
  };
}

export function isRenderMode(value: unknown): value is CanvasRenderMode {
  return value === "static" || value === "client" || value === "both";
}

function parseNodes(value: unknown): CanvasNode[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const nodes: CanvasNode[] = [];
  for (const entry of value) {
    const node = parseNode(entry);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseNode(value: unknown): CanvasNode | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;
  const type = NODE_TYPES.includes(value.type as CanvasNodeType)
    ? (value.type as CanvasNodeType)
    : "text";

  return {
    id,
    type,
    x: asNumber(value.x) ?? 0,
    y: asNumber(value.y) ?? 0,
    width: asNumber(value.width) ?? DEFAULT_NODE_WIDTH,
    height: asNumber(value.height) ?? DEFAULT_NODE_HEIGHT,
    color: asString(value.color),
    text: asString(value.text),
    file: asString(value.file),
    subpath: asString(value.subpath),
    url: asString(value.url),
    label: asString(value.label),
  };
}

function parseEdges(value: unknown): CanvasEdge[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const edges: CanvasEdge[] = [];
  for (const entry of value) {
    const edge = parseEdge(entry);
    if (edge) edges.push(edge);
  }
  return edges;
}

function parseEdge(value: unknown): CanvasEdge | null {
  if (!isRecord(value)) return null;
  const fromNode = asString(value.fromNode);
  const toNode = asString(value.toNode);
  if (!fromNode || !toNode) return null;

  return {
    id: asString(value.id) ?? `${fromNode}->${toNode}`,
    fromNode,
    fromSide: asSide(value.fromSide),
    toNode,
    toSide: asSide(value.toSide),
    color: asString(value.color),
    label: asString(value.label),
  };
}

function normalizeNode(node: CanvasNode, index: number): CanvasNode {
  const x = Number.isFinite(node.x) ? node.x : fallbackX(index);
  const y = Number.isFinite(node.y) ? node.y : fallbackY(index);
  const width =
    Number.isFinite(node.width) && node.width > 0
      ? node.width
      : DEFAULT_NODE_WIDTH;
  const height =
    Number.isFinite(node.height) && node.height > 0
      ? node.height
      : DEFAULT_NODE_HEIGHT;
  return { ...node, x, y, width, height };
}

function fallbackX(index: number): number {
  return (index % FALLBACK_COLUMNS) * FALLBACK_COLUMN_GAP;
}

function fallbackY(index: number): number {
  return Math.floor(index / FALLBACK_COLUMNS) * FALLBACK_ROW_GAP;
}

function asSide(value: unknown): CanvasEdgeSide | undefined {
  return EDGE_SIDES.includes(value as CanvasEdgeSide)
    ? (value as CanvasEdgeSide)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
