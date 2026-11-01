import type {
  GraphDocument,
  GraphMode,
  GraphNode,
  GraphSettings,
  VisibleGraph,
  VisibleGraphNode,
} from "./index.js";
import {
  buildRevealSchedule,
  buildVisibleGraph,
  createGraphSimulation,
  type GraphSimulation,
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

type Camera = { x: number; y: number; scale: number };
type Point = { x: number; y: number };
type DragState =
  | { kind: "pan"; lastX: number; lastY: number; moved: boolean }
  | {
      kind: "node";
      id: string;
      startX: number;
      startY: number;
      moved: boolean;
    }
  | null;

const MIN_SCALE = 0.12;
const MAX_SCALE = 4;
const DRAG_THRESHOLD_PX = 4;
const ANIMATION_DURATION_MS = 3200;

export function createGraphRenderer(
  options: GraphRendererOptions,
): GraphRenderer {
  const canvas = options.canvas;
  const context = canvas.getContext("2d");
  if (!context) {
    return createNoopRenderer();
  }
  const ctx = context;

  const callbacks: GraphRendererCallbacks = options;
  let input: GraphRendererInput | null = null;
  let visible: VisibleGraph = {
    nodes: [],
    links: [],
    centerId: null,
    unsupportedOperators: [],
  };
  let simulation: GraphSimulation | null = null;
  let signature = "";
  let camera: Camera = { x: 0, y: 0, scale: 1 };
  let size = { width: 0, height: 0 };
  let hoveredId: string | null = null;
  let selectedId: string | null = null;
  let drag: DragState = null;
  const pointers = new Map<number, Point>();
  let pinch: { distance: number; center: Point } | null = null;
  let frameHandle: number | null = null;
  let paused = false;
  let destroyed = false;
  let animating = false;
  let animationStart = 0;
  let animationCutoff = 1;
  let pendingFit = false;
  let reveal = new Map<string, number>();
  let colors = readColors(canvas);
  const reducedMotion = options.reducedMotion ?? false;

  const resizeObserver = new ResizeObserver(() => resize());
  const intersectionObserver = new IntersectionObserver((entries) => {
    paused = entries.every((entry) => !entry.isIntersecting);
    if (!paused) requestFrame();
  });
  const mutationObserver = new MutationObserver(() => {
    colors = readColors(canvas);
    requestFrame();
  });

  const onVisibilityChange = () => {
    paused = document.visibilityState === "hidden";
    if (!paused) requestFrame();
  };

  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  mutationObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-rb-mode", "data-rb-theme", "class", "style"],
  });
  document.addEventListener("visibilitychange", onVisibilityChange);

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("keydown", onKeyDown);

  resize();

  return {
    update,
    setSelected,
    zoomBy,
    resetView,
    focusNode,
    playAnimation,
    stopAnimation,
    isAnimating: () => animating,
    destroy,
  };

  function update(next: GraphRendererInput): void {
    if (destroyed) return;
    const previousMode = input?.mode;
    const previousCenter = input?.centerId;
    const previousDocument = input?.document;
    input = next;
    visible = buildVisibleGraph({
      document: next.document,
      settings: next.settings,
      mode: next.mode,
      centerId: next.centerId,
    });
    selectedId = next.selectedId ?? null;
    reveal = new Map(
      buildRevealSchedule(visible.nodes).map((entry) => [entry.id, entry.at]),
    );

    const nextSignature = visibleSignature(visible);
    const positions = simulation
      ? new Map(
          simulation.nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
        )
      : undefined;

    if (nextSignature !== signature || !simulation) {
      signature = nextSignature;
      simulation = createGraphSimulation({
        nodeIds: visible.nodes.map((node) => node.id),
        links: visible.links,
        options: forceOptions(next.settings),
        positions,
        centerId: visible.centerId,
      });
      if (
        !previousDocument ||
        previousDocument !== next.document ||
        previousMode !== next.mode ||
        previousCenter !== next.centerId
      ) {
        pendingFit = true;
        fitView();
      }
    } else {
      simulation.setOptions(forceOptions(next.settings));
    }

    if (!next.settings.animate) {
      animating = false;
      animationCutoff = 1;
    }
    requestFrame();
  }

  function setSelected(id: string | null): void {
    if (selectedId === id) return;
    selectedId = id;
    requestFrame();
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    size = { width, height };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (camera.x === 0 && camera.y === 0) {
      camera = { x: width / 2, y: height / 2, scale: 1 };
    }
    requestFrame();
  }

  function fitView(): void {
    if (visible.nodes.length === 0) {
      camera = { x: size.width / 2, y: size.height / 2, scale: 1 };
      return;
    }
    const positions = simulation?.nodes ?? [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const node of positions) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    if (!Number.isFinite(minX)) {
      camera = { x: size.width / 2, y: size.height / 2, scale: 1 };
      return;
    }
    const boundsWidth = Math.max(maxX - minX, 80);
    const boundsHeight = Math.max(maxY - minY, 80);
    const scale = clamp(
      Math.min(
        (size.width - 80) / boundsWidth,
        (size.height - 80) / boundsHeight,
      ),
      0.2,
      2,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    camera = {
      x: size.width / 2 - centerX * scale,
      y: size.height / 2 - centerY * scale,
      scale,
    };
  }

  function resetView(): void {
    pendingFit = false;
    fitView();
    requestFrame();
  }

  function focusNode(id: string): void {
    const node = simulation?.nodes.find((entry) => entry.id === id);
    if (!node) return;
    pendingFit = false;
    camera = {
      ...camera,
      x: size.width / 2 - node.x * camera.scale,
      y: size.height / 2 - node.y * camera.scale,
    };
    requestFrame();
  }

  function zoomBy(factor: number, origin?: Point): void {
    pendingFit = false;
    const center = origin ?? { x: size.width / 2, y: size.height / 2 };
    const scale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
    if (scale === camera.scale) return;
    const worldX = (center.x - camera.x) / camera.scale;
    const worldY = (center.y - camera.y) / camera.scale;
    camera = {
      x: center.x - worldX * scale,
      y: center.y - worldY * scale,
      scale,
    };
    requestFrame();
  }

  function playAnimation(): void {
    if (reducedMotion || visible.nodes.length === 0) {
      animationCutoff = 1;
      animating = false;
      callbacks.onAnimationChange?.(false);
      requestFrame();
      return;
    }
    animationStart = performance.now();
    animationCutoff = 0;
    animating = true;
    callbacks.onAnimationChange?.(true);
    requestFrame();
  }

  function stopAnimation(): void {
    animating = false;
    animationCutoff = 1;
    callbacks.onAnimationChange?.(false);
    requestFrame();
  }

  function requestFrame(): void {
    if (destroyed || paused || frameHandle !== null) return;
    frameHandle = requestAnimationFrame(frame);
  }

  function frame(time: number): void {
    frameHandle = null;
    if (destroyed) return;
    if (animating) {
      const progress = clamp(
        (time - animationStart) / ANIMATION_DURATION_MS,
        0,
        1,
      );
      animationCutoff = progress;
      if (progress >= 1) {
        animating = false;
        callbacks.onAnimationChange?.(false);
      }
    }
    const active = simulation?.tick() ?? false;
    if (pendingFit && simulation && !active) {
      pendingFit = false;
      fitView();
    }
    draw();
    if (active || animating) requestFrame();
  }

  function draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, size.width, size.height);

    const related = relatedIds();
    const dimOthers = related.size > 0;
    const selected = selectedId;
    const labelThreshold = 0.35 + (input?.settings.textFade ?? 0.35) * 1.1;
    const labelAlpha = clamp((camera.scale - labelThreshold) / 0.4, 0, 1);
    const nodes = simulation?.nodes ?? [];
    const simulationById = new Map(nodes.map((node) => [node.id, node]));
    const positions = new Map<
      string,
      { node: VisibleGraphNode; x: number; y: number; radius: number }
    >();

    for (const node of visible.nodes) {
      const revealAt = reveal.get(node.id);
      if (revealAt !== undefined && revealAt > animationCutoff) {
        continue;
      }
      const simulationNode = simulationById.get(node.id);
      if (!simulationNode) continue;
      const x = simulationNode.x;
      const y = simulationNode.y;
      positions.set(node.id, {
        node,
        x,
        y,
        radius: Math.max(2, node.radius * (input?.settings.nodeSize ?? 1)),
      });
    }

    const linkThickness = input?.settings.linkThickness ?? 1;
    ctx.lineCap = "round";
    for (const link of visible.links) {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) continue;
      const emphasized = related.has(link.source) && related.has(link.target);
      const alpha = dimOthers ? (emphasized ? 0.72 : 0.06) : 0.28;
      const [sx, sy] = toScreen(source.x, source.y);
      const [tx, ty] = toScreen(target.x, target.y);
      if (!segmentVisible(sx, sy, tx, ty)) continue;
      ctx.strokeStyle = withAlpha(colors.edge, alpha);
      ctx.lineWidth = Math.max(
        0.5,
        linkThickness * (emphasized ? 1.15 : 0.7) * Math.sqrt(camera.scale),
      );
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      if (input?.settings.arrows) {
        drawArrow(sx, sy, tx, ty, alpha);
      }
    }

    const labelBudget =
      visible.nodes.length > 900 ? 0 : visible.nodes.length > 500 ? 120 : 400;
    let labelsDrawn = 0;
    const labelBounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }[] = [];
    for (const entry of positions.values()) {
      const { node, x, y, radius } = entry;
      const [sx, sy] = toScreen(x, y);
      const screenRadius = Math.max(1.5, radius * camera.scale);
      if (
        sx < -screenRadius ||
        sy < -screenRadius ||
        sx > size.width + screenRadius ||
        sy > size.height + screenRadius
      ) {
        continue;
      }
      const isRelated = related.has(node.id);
      const alpha = dimOthers && !isRelated ? 0.15 : 0.92;
      const isSelected = selected === node.id;
      const isHovered = hoveredId === node.id;

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(sx, sy, screenRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(colors.focus, isSelected ? 0.9 : 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, screenRadius, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(nodeColor(node), alpha);
      ctx.fill();
      ctx.strokeStyle = withAlpha(colors.background, 0.8);
      ctx.lineWidth = 1;
      ctx.stroke();

      const canDrawLabel =
        labelAlpha > 0.02 &&
        (labelBudget === 0
          ? isSelected || isHovered || isRelated
          : labelsDrawn < labelBudget);
      if (!canDrawLabel) continue;
      labelsDrawn += 1;
      const title = truncateLabel(node.title);
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const labelWidth = ctx.measureText(title).width;
      let labelX = sx + screenRadius + 6;
      let left = labelX;
      let right = labelX + labelWidth;
      if (right > size.width - 4) {
        labelX = sx - screenRadius - 6;
        ctx.textAlign = "right";
        left = labelX - labelWidth;
        right = labelX;
      }
      const labelY = sy;
      const top = labelY - 7;
      const bottom = labelY + 7;
      if (
        top < 4 ||
        bottom > size.height - 4 ||
        labelBounds.some(
          (bounds) =>
            left < bounds.right &&
            right > bounds.left &&
            top < bounds.bottom &&
            bottom > bounds.top,
        )
      ) {
        continue;
      }
      labelBounds.push({ left, top, right, bottom });
      ctx.strokeStyle = withAlpha(colors.background, 0.85 * labelAlpha * alpha);
      ctx.lineWidth = 3;
      ctx.strokeText(title, labelX, labelY);
      ctx.fillStyle = withAlpha(colors.label, labelAlpha * alpha);
      ctx.fillText(title, labelX, labelY);
    }
  }

  function drawArrow(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    alpha: number,
  ): void {
    const angle = Math.atan2(ty - sy, tx - sx);
    const length = 5;
    const x = tx - Math.cos(angle) * 4;
    const y = ty - Math.sin(angle) * 4;
    ctx.fillStyle = withAlpha(colors.edge, Math.min(0.8, alpha + 0.1));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - Math.cos(angle - 0.45) * length,
      y - Math.sin(angle - 0.45) * length,
    );
    ctx.lineTo(
      x - Math.cos(angle + 0.45) * length,
      y - Math.sin(angle + 0.45) * length,
    );
    ctx.closePath();
    ctx.fill();
  }

  function toScreen(x: number, y: number): [number, number] {
    return [camera.x + x * camera.scale, camera.y + y * camera.scale];
  }

  function toWorld(clientX: number, clientY: number): Point {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.x) / camera.scale,
      y: (clientY - rect.top - camera.y) / camera.scale,
    };
  }

  function hitTest(clientX: number, clientY: number): VisibleGraphNode | null {
    if (!input) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { node: VisibleGraphNode; distance: number } | null = null;
    const nodes = simulation?.nodes ?? [];
    const simulationById = new Map(nodes.map((node) => [node.id, node]));
    for (const node of visible.nodes) {
      if ((reveal.get(node.id) ?? 0) > animationCutoff) continue;
      const simulationNode = simulationById.get(node.id);
      if (!simulationNode) continue;
      const [sx, sy] = toScreen(simulationNode.x, simulationNode.y);
      const radius = Math.max(
        6,
        node.radius * (input.settings.nodeSize ?? 1) * camera.scale + 4,
      );
      const distance = Math.hypot(x - sx, y - sy);
      if (distance <= radius && (!best || distance < best.distance)) {
        best = { node, distance };
      }
    }
    return best?.node ?? null;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    pendingFit = false;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      if (first && second) {
        pinch = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          center: {
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
          },
        };
        if (drag?.kind === "node" && simulation) {
          simulation.release(drag.id);
        }
        drag = null;
      }
      return;
    }

    const node = hitTest(event.clientX, event.clientY);
    if (node) {
      selectedId = node.id;
      callbacks.onSelect?.(node);
      drag = {
        kind: "node",
        id: node.id,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      requestFrame();
      return;
    }
    drag = {
      kind: "pan",
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch && pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      if (!first || !second) return;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const rect = canvas.getBoundingClientRect();
      camera = {
        ...camera,
        x: camera.x + center.x - pinch.center.x,
        y: camera.y + center.y - pinch.center.y,
      };
      if (pinch.distance > 0) {
        zoomBy(distance / pinch.distance, {
          x: center.x - rect.left,
          y: center.y - rect.top,
        });
      }
      pinch = { distance, center };
      return;
    }

    if (drag?.kind === "node") {
      const moved =
        drag.moved ||
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >=
          DRAG_THRESHOLD_PX;
      if (!moved) return;
      drag.moved = true;
      const point = toWorld(event.clientX, event.clientY);
      simulation?.fix(drag.id, point.x, point.y);
      requestFrame();
      return;
    }

    if (drag?.kind === "pan") {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 0) drag.moved = true;
      camera = { ...camera, x: camera.x + dx, y: camera.y + dy };
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      requestFrame();
      return;
    }

    const node = hitTest(event.clientX, event.clientY);
    const nextHovered = node?.id ?? null;
    canvas.style.cursor = node ? "pointer" : "grab";
    if (hoveredId !== nextHovered) {
      hoveredId = nextHovered;
      callbacks.onHover?.(node);
      requestFrame();
    }
  }

  function onPointerUp(event: PointerEvent): void {
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (pointers.size < 2) pinch = null;

    const currentDrag = drag;
    drag = null;
    if (!currentDrag) return;

    if (currentDrag.kind === "node") {
      if (simulation) simulation.release(currentDrag.id);
      if (!currentDrag.moved) {
        const node = visible.nodes.find((entry) => entry.id === currentDrag.id);
        if (node) callbacks.onOpen?.(node);
      }
    } else if (!currentDrag.moved) {
      selectedId = null;
      callbacks.onSelect?.(null);
    }
    requestFrame();
  }

  function onPointerLeave(): void {
    if (drag) return;
    if (hoveredId !== null) {
      hoveredId = null;
      callbacks.onHover?.(null);
      requestFrame();
    }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomBy(Math.exp(-event.deltaY * 0.0015), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function onDoubleClick(event: MouseEvent): void {
    const node = hitTest(event.clientX, event.clientY);
    if (node) {
      callbacks.onOpen?.(node);
      return;
    }
    resetView();
  }

  function onContextMenu(event: MouseEvent): void {
    const node = hitTest(event.clientX, event.clientY);
    if (!node) return;
    event.preventDefault();
    callbacks.onContextMenu?.(node, event.clientX, event.clientY);
  }

  function onKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 120 : 40;
    switch (event.key) {
      case "+":
      case "=":
        event.preventDefault();
        zoomBy(1.2);
        return;
      case "-":
      case "_":
        event.preventDefault();
        zoomBy(1 / 1.2);
        return;
      case "ArrowLeft":
        event.preventDefault();
        pendingFit = false;
        camera = { ...camera, x: camera.x + step };
        break;
      case "ArrowRight":
        event.preventDefault();
        pendingFit = false;
        camera = { ...camera, x: camera.x - step };
        break;
      case "ArrowUp":
        event.preventDefault();
        pendingFit = false;
        camera = { ...camera, y: camera.y + step };
        break;
      case "ArrowDown":
        event.preventDefault();
        pendingFit = false;
        camera = { ...camera, y: camera.y - step };
        break;
      case "Escape":
        selectedId = null;
        callbacks.onSelect?.(null);
        break;
      case "Enter": {
        const node =
          visible.nodes.find(
            (entry) => entry.id === (hoveredId ?? selectedId),
          ) ?? null;
        if (node) {
          event.preventDefault();
          callbacks.onOpen?.(node);
        }
        return;
      }
      case "n":
      case "N":
      case "p":
      case "P": {
        const index = visible.nodes.findIndex(
          (entry) => entry.id === selectedId,
        );
        if (visible.nodes.length === 0) return;
        event.preventDefault();
        const direction = event.key.toLowerCase() === "n" ? 1 : -1;
        const next =
          visible.nodes[
            (index + direction + visible.nodes.length) % visible.nodes.length
          ];
        if (next) {
          selectedId = next.id;
          callbacks.onSelect?.(next);
          focusNode(next.id);
          requestFrame();
        }
        return;
      }
      default:
        return;
    }
    requestFrame();
  }

  function relatedIds(): Set<string> {
    const origin = hoveredId;
    const related = new Set<string>();
    if (!origin) return related;
    related.add(origin);
    for (const link of visible.links) {
      if (link.source === origin) related.add(link.target);
      if (link.target === origin) related.add(link.source);
    }
    return related;
  }

  function nodeColor(node: VisibleGraphNode): string {
    if (node.color) return node.color;
    switch (node.kind) {
      case "unresolved":
      case "attachment":
        return colors.muted;
      case "tag":
        return colors.link;
      case "note":
        return colors.accent;
    }
  }

  function segmentVisible(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): boolean {
    return !(
      Math.max(x1, x2) < 0 ||
      Math.max(y1, y2) < 0 ||
      Math.min(x1, x2) > size.width ||
      Math.min(y1, y2) > size.height
    );
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
    simulation?.stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    mutationObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("dblclick", onDoubleClick);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("keydown", onKeyDown);
  }
}

function forceOptions(settings: GraphSettings) {
  return {
    centerForce: settings.centerForce,
    repelForce: settings.repelForce,
    linkForce: settings.linkForce,
    linkDistance: settings.linkDistance,
  };
}

function visibleSignature(visible: VisibleGraph): string {
  return `${visible.nodes.map((node) => node.id).join("\0")}|${visible.links
    .map((link) => `${link.source}>${link.target}`)
    .join("\0")}`;
}

function readColors(canvas: HTMLCanvasElement) {
  const style = getComputedStyle(canvas);
  return {
    background: css(style, "--rb-color-paper", "#ffffff"),
    accent: css(style, "--rb-color-accent", "#2563eb"),
    link: css(style, "--rb-color-link", "#2563eb"),
    ink: css(style, "--rb-color-ink", "#1f2937"),
    muted: css(style, "--rb-color-muted", "#6b7280"),
    edge: css(style, "--rb-color-border-strong", "#94a3b8"),
    label: css(style, "--rb-color-ink", "#1f2937"),
    focus: css(style, "--rb-color-focus", "#2563eb"),
  };
}

function css(
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  const value = style.getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

function withAlpha(color: string, alpha: number): string {
  const clamped = clamp(alpha, 0, 1);
  if (color.startsWith("#")) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split("")
            .map((character) => character + character)
            .join("")
        : color.slice(1);
    if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${clamped})`);
  }
  return color;
}

function truncateLabel(title: string): string {
  return title.length > 34 ? `${title.slice(0, 33)}…` : title;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createNoopRenderer(): GraphRenderer {
  return {
    update() {},
    setSelected() {},
    zoomBy() {},
    resetView() {},
    focusNode() {},
    playAnimation() {},
    stopAnimation() {},
    isAnimating: () => false,
    destroy() {},
  };
}
