export type CanvasRenderMode = "static" | "client" | "both";

export type CanvasOptions = {
  /**
   * CSS class applied to the wrapper element. Defaults to `"rb-canvas"`.
   */
  className?: string;
  /**
   * Fenced code block language that carries canvas content. Defaults to
   * `"canvas"`.
   */
  language?: string;
  /**
   * Where the canvas is drawn. `"both"` renders a static fallback and hydrates
   * it on the client. Defaults to `"both"`.
   */
  render?: CanvasRenderMode;
  /**
   * Optional CSS length applied to the rendered canvas stage.
   */
  height?: number | string;
  /**
   * Maximum number of nodes drawn in the static stage. Unset renders all.
   */
  maxNodes?: number;
};

export type ResolvedCanvasOptions = {
  className: string;
  language: string;
  render: CanvasRenderMode;
  height: number | string | undefined;
  maxNodes: number | undefined;
};

export type CanvasNodeType = "text" | "file" | "link" | "group";

export type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  subpath?: string;
  url?: string;
  label?: string;
};

export type CanvasEdgeSide = "top" | "right" | "bottom" | "left";

export type CanvasEdge = {
  id: string;
  fromNode: string;
  fromSide?: CanvasEdgeSide;
  toNode: string;
  toSide?: CanvasEdgeSide;
  color?: string;
  label?: string;
};

export type CanvasDocument = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

export type CanvasLayoutNode = CanvasNode & {
  centerX: number;
  centerY: number;
};

export type CanvasLayoutEdge = CanvasEdge & {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CanvasLayout = {
  width: number;
  height: number;
  nodes: CanvasLayoutNode[];
  edges: CanvasLayoutEdge[];
};

export type CanvasFileLink =
  | { kind: "note"; slug: string; label: string }
  | { kind: "asset"; url: string; label: string }
  | { kind: "unresolved"; label: string };

export type CanvasResolver = {
  resolveFile(file: string): CanvasFileLink;
  resolveWikilink(target: string): { slug: string; label: string } | null;
};