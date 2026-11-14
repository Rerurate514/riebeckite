import type { GraphColors } from "./client_utils.js";
import type {
  GraphDocument,
  GraphMode,
  GraphNode,
  GraphSettings,
  GraphSimulation,
  VisibleGraph,
  VisibleGraphNode,
} from "./index.js";

export type GraphRendererCallbacks = {
  onSelect?: (node: GraphNode | null) => void;
  onOpen?: (node: GraphNode) => void;
  onHover?: (node: GraphNode | null) => void;
  onContextMenu?: (node: GraphNode, x: number, y: number) => void;
  onAnimationChange?: (animating: boolean) => void;
};

export type GraphRendererInput = {
  document: GraphDocument;
  settings: GraphSettings;
  mode: GraphMode;
  centerId?: string | null;
  selectedId?: string | null;
};

export type GraphRendererOptions = GraphRendererCallbacks & {
  canvas: HTMLCanvasElement;
  reducedMotion?: boolean;
};

export type GraphRenderer = {
  update(input: GraphRendererInput): void;
  setSelected(id: string | null): void;
  zoomBy(factor: number, origin?: { x: number; y: number }): void;
  resetView(): void;
  focusNode(id: string): void;
  playAnimation(): void;
  stopAnimation(): void;
  isAnimating(): boolean;
  destroy(): void;
};

export type Camera = { x: number; y: number; scale: number };
export type Point = { x: number; y: number };
export type DragState =
  | { kind: "pan"; lastX: number; lastY: number; moved: boolean }
  | {
      kind: "node";
      id: string;
      startX: number;
      startY: number;
      moved: boolean;
    }
  | null;

export const MIN_SCALE = 0.12;
export const MAX_SCALE = 4;
export const DRAG_THRESHOLD_PX = 4;
export const ANIMATION_DURATION_MS = 3200;

export type RendererContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  callbacks: GraphRendererCallbacks;
  input: GraphRendererInput | null;
  visible: VisibleGraph;
  simulation: GraphSimulation | null;
  signature: string;
  camera: Camera;
  size: { width: number; height: number };
  hoveredId: string | null;
  selectedId: string | null;
  drag: DragState;
  pointers: Map<number, Point>;
  pinch: { distance: number; center: Point } | null;
  frameHandle: number | null;
  paused: boolean;
  destroyed: boolean;
  animating: boolean;
  animationStart: number;
  animationCutoff: number;
  pendingFit: boolean;
  reveal: Map<string, number>;
  colors: GraphColors;
  reducedMotion: boolean;
  update(input: GraphRendererInput): void;
  setSelected(id: string | null): void;
  resize(): void;
  fitView(): void;
  resetView(): void;
  focusNode(id: string): void;
  zoomBy(factor: number, origin?: Point): void;
  playAnimation(): void;
  stopAnimation(): void;
  requestFrame(): void;
  frame(time: number): void;
  draw(): void;
  drawArrow(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    alpha: number,
  ): void;
  toScreen(x: number, y: number): [number, number];
  toWorld(clientX: number, clientY: number): Point;
  hitTest(clientX: number, clientY: number): VisibleGraphNode | null;
  relatedIds(): Set<string>;
  nodeColor(node: VisibleGraphNode): string;
  segmentVisible(x1: number, y1: number, x2: number, y2: number): boolean;
  onPointerDown(event: PointerEvent): void;
  onPointerMove(event: PointerEvent): void;
  onPointerUp(event: PointerEvent): void;
  onPointerLeave(): void;
  onWheel(event: WheelEvent): void;
  onDoubleClick(event: MouseEvent): void;
  onContextMenu(event: MouseEvent): void;
  onKeyDown(event: KeyboardEvent): void;
};

export function asRendererContext<Self>(self: Self): RendererContext {
  return self as RendererContext;
}
