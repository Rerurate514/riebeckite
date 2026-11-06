import {
  CANVAS_PADDING,
  fitBounds,
  panBy,
  worldToScreen,
  zoomAt,
} from "./camera.js";
import { buildCanvasLayout, parseCanvas } from "./parse.js";
import type { CanvasCamera, CanvasLayout } from "./types.js";

export function initCanvas(root: ParentNode = document): void {
  for (const container of root.querySelectorAll<HTMLElement>(
    '[data-canvas-render="client"], [data-canvas-render="both"]',
  )) {
    if (container.dataset.canvasInitialized === "true") continue;
    try {
      initContainer(container);
      container.dataset.canvasInitialized = "true";
      container.dataset.canvasRender = "ready";
    } catch {
      container.dataset.canvasError = "true";
    }
  }
}

function initContainer(container: HTMLElement): void {
  const payload = container.dataset.canvasPayload;
  const stage = container.querySelector<HTMLElement>(".rb-canvas__stage");
  const world = container.querySelector<HTMLElement>("[data-canvas-world]");
  if (!payload || !stage || !world)
    throw new Error("Canvas markup is incomplete.");
  const document = parseCanvas(payload);
  if (!document) throw new Error("Canvas payload is invalid.");
  const nodes = limitNodes(document.nodes, container);
  const layout = buildCanvasLayout({ nodes, edges: document.edges });

  stage.replaceChildren(world, buildSelection(), buildControls());
  stage.tabIndex = 0;
  stage.setAttribute("role", "application");
  stage.setAttribute("aria-label", "Interactive canvas");
  applyDynamicStyles(world);
  enableViewer(stage, world, layout);
}

function limitNodes<T>(nodes: readonly T[], container: HTMLElement): T[] {
  const maximum = Number(container.dataset.canvasMaxNodes);
  return Number.isInteger(maximum) && maximum > 0
    ? nodes.slice(0, maximum)
    : [...nodes];
}

function buildSelection(): HTMLElement {
  const selection = document.createElement("div");
  selection.className = "rb-canvas__selection";
  selection.dataset.canvasSelection = "true";
  return selection;
}

function buildControls(): HTMLElement {
  const controls = document.createElement("div");
  controls.className = "rb-canvas__controls";
  controls.setAttribute("aria-label", "Canvas controls");
  for (const [action, label, icon] of [
    ["zoom-in", "Zoom in", "+"],
    ["zoom-out", "Zoom out", "−"],
    ["fit", "Zoom to fit", "⊡"],
    ["selection", "Zoom to selection", "◉"],
    ["reset", "Reset zoom", "1:1"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rb-canvas__control";
    button.dataset.canvasAction = action;
    button.setAttribute("aria-label", label);
    button.textContent = icon;
    controls.append(button);
  }
  return controls;
}

function enableViewer(
  stage: HTMLElement,
  world: HTMLElement,
  layout: CanvasLayout,
): void {
  let camera: CanvasCamera = { x: 0, y: 0, scale: 1 };
  let drag: { pointerId: number; x: number; y: number } | null = null;
  let selectionStart: { x: number; y: number } | null = null;
  let animationFrame = 0;
  let spacePressed = false;
  const selected = new Set<string>();
  const touchPoints = new Map<number, { x: number; y: number }>();
  const selectionBox = stage.querySelector<HTMLElement>(
    "[data-canvas-selection]",
  );

  const render = () => {
    animationFrame = 0;
    world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    stage.style.backgroundPosition = `${camera.x}px ${camera.y}px`;
    stage.style.backgroundSize = `${20 * camera.scale}px ${20 * camera.scale}px`;
  };
  const scheduleRender = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  };
  const fit = () => {
    const bounds = stage.getBoundingClientRect();
    camera = fitBounds(layout, bounds.width, bounds.height);
    scheduleRender();
  };
  const zoom = (factor: number, clientX: number, clientY: number) => {
    const bounds = stage.getBoundingClientRect();
    camera = zoomAt(camera, factor, {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    });
    scheduleRender();
  };
  const updateSelection = () => {
    for (const node of world.querySelectorAll<HTMLElement>(
      "[data-canvas-node-id]",
    )) {
      node.toggleAttribute(
        "data-canvas-selected",
        selected.has(node.dataset.canvasNodeId ?? ""),
      );
    }
  };
  const zoomSelection = () => {
    const selectedNodes = layout.nodes.filter((node) => selected.has(node.id));
    if (selectedNodes.length === 0) return;
    const minX = Math.min(...selectedNodes.map((node) => node.x));
    const minY = Math.min(...selectedNodes.map((node) => node.y));
    const maxX = Math.max(...selectedNodes.map((node) => node.x + node.width));
    const maxY = Math.max(...selectedNodes.map((node) => node.y + node.height));
    const selectionLayout = {
      ...layout,
      width: maxX - minX,
      height: maxY - minY,
    };
    const bounds = stage.getBoundingClientRect();
    const fitted = fitBounds(selectionLayout, bounds.width, bounds.height);
    camera = {
      ...fitted,
      x: fitted.x - minX * fitted.scale,
      y: fitted.y - minY * fitted.scale,
    };
    scheduleRender();
  };
  const finishSelection = () => {
    if (!selectionStart || !selectionBox) return;
    const box = selectionBox.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    const left = box.left - stageBounds.left;
    const top = box.top - stageBounds.top;
    const right = left + box.width;
    const bottom = top + box.height;
    for (const node of layout.nodes) {
      const point = worldToScreen({ x: node.x, y: node.y }, camera);
      const nodeRight = point.x + node.width * camera.scale;
      const nodeBottom = point.y + node.height * camera.scale;
      if (
        point.x < right &&
        nodeRight > left &&
        point.y < bottom &&
        nodeBottom > top
      )
        selected.add(node.id);
    }
    selectionStart = null;
    stage.removeAttribute("data-canvas-selecting");
    updateSelection();
  };

  fit();
  const observer = new ResizeObserver(() => {
    if (!stage.isConnected) {
      observer.disconnect();
      return;
    }
    fit();
  });
  observer.observe(stage);
  stage.addEventListener(
    "wheel",
    (event) => {
      const focused = stage.contains(document.activeElement);
      if (event.ctrlKey || event.metaKey || spacePressed) {
        event.preventDefault();
        zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX, event.clientY);
        return;
      }
      if (!focused) return;
      event.preventDefault();
      camera = panBy(camera, {
        x: event.shiftKey ? -event.deltaY : -event.deltaX,
        y: event.shiftKey ? 0 : -event.deltaY,
      });
      scheduleRender();
    },
    { passive: false },
  );
  stage.addEventListener("keydown", (event) => {
    if (event.code === "Space") spacePressed = true;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      for (const node of layout.nodes) selected.add(node.id);
      updateSelection();
    }
    if (
      event.shiftKey &&
      (event.code === "Digit1" || event.code === "Numpad1")
    ) {
      event.preventDefault();
      fit();
    }
    if (
      event.shiftKey &&
      (event.code === "Digit2" || event.code === "Numpad2")
    ) {
      event.preventDefault();
      zoomSelection();
    }
  });
  stage.addEventListener("keyup", (event) => {
    if (event.code === "Space") spacePressed = false;
  });
  stage.addEventListener("blur", () => {
    spacePressed = false;
  });
  stage.addEventListener("pointerdown", (event) => {
    stage.focus({ preventScroll: true });
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        "a, button, audio, video, input, textarea, .rb-canvas__node-text",
      )
    )
      return;
    const node = target?.closest<HTMLElement>("[data-canvas-node-id]");
    if (node) {
      const id = node.dataset.canvasNodeId ?? "";
      if (event.shiftKey)
        selected.has(id) ? selected.delete(id) : selected.add(id);
      else {
        selected.clear();
        selected.add(id);
      }
      updateSelection();
      return;
    }
    if (event.pointerType === "touch") {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size === 1) {
        drag = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        stage.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (event.shiftKey) {
      selected.clear();
      selectionStart = pointInStage(stage, event);
      updateSelectionBox(stage, selectionBox, selectionStart, selectionStart);
      stage.setAttribute("data-canvas-selecting", "true");
      stage.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 1 && !spacePressed) {
      selected.clear();
      updateSelection();
      return;
    }
    event.preventDefault();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && touchPoints.has(event.pointerId)) {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size === 2) {
        const [first, second] = [...touchPoints.values()];
        if (first && second) {
          const previous = drag;
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (previous) {
            const previousDistance = Number(
              stage.dataset.canvasPinchDistance ?? distance,
            );
            const centerX = (first.x + second.x) / 2;
            const centerY = (first.y + second.y) / 2;
            zoom(distance / previousDistance, centerX, centerY);
          }
          stage.dataset.canvasPinchDistance = String(distance);
        }
        return;
      }
    }
    if (selectionStart) {
      updateSelectionBox(
        stage,
        selectionBox,
        selectionStart,
        pointInStage(stage, event),
      );
      return;
    }
    if (!drag || drag.pointerId !== event.pointerId) return;
    camera = panBy(camera, {
      x: event.clientX - drag.x,
      y: event.clientY - drag.y,
    });
    drag = { ...drag, x: event.clientX, y: event.clientY };
    scheduleRender();
  });
  const stop = (event: PointerEvent) => {
    touchPoints.delete(event.pointerId);
    if (touchPoints.size < 2) delete stage.dataset.canvasPinchDistance;
    if (touchPoints.size === 1) {
      const remaining = touchPoints.entries().next().value;
      if (!remaining) return;
      const [pointerId, point] = remaining;
      drag = { pointerId, x: point.x, y: point.y };
      stage.setPointerCapture(pointerId);
      return;
    }
    if (selectionStart) finishSelection();
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    if (stage.hasPointerCapture(event.pointerId))
      stage.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
  stage.addEventListener("click", (event) => {
    const action = (
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-canvas-action]")
        : null
    )?.dataset.canvasAction;
    const bounds = stage.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    if (action === "zoom-in") zoom(1.25, centerX, centerY);
    if (action === "zoom-out") zoom(0.8, centerX, centerY);
    if (action === "fit") fit();
    if (action === "selection") zoomSelection();
    if (action === "reset") {
      camera = { x: CANVAS_PADDING, y: CANVAS_PADDING, scale: 1 };
      scheduleRender();
    }
  });
}

function pointInStage(
  stage: HTMLElement,
  event: PointerEvent,
): { x: number; y: number } {
  const bounds = stage.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function updateSelectionBox(
  stage: HTMLElement,
  selection: HTMLElement | null,
  start: { x: number; y: number },
  end: { x: number; y: number },
): void {
  if (!selection) return;
  selection.style.left = `${Math.min(start.x, end.x)}px`;
  selection.style.top = `${Math.min(start.y, end.y)}px`;
  selection.style.width = `${Math.abs(end.x - start.x)}px`;
  selection.style.height = `${Math.abs(end.y - start.y)}px`;
  stage.setAttribute("data-canvas-selecting", "true");
}

function applyDynamicStyles(world: HTMLElement): void {
  for (const node of world.querySelectorAll<HTMLElement>(
    "[data-canvas-color]",
  )) {
    const color = node.dataset.canvasColor;
    if (color && /^#[0-9a-f]{6}$/i.test(color))
      node.style.setProperty("--rb-canvas-node-color", color);
    const background = node.dataset.canvasBackground;
    if (background) {
      node.style.backgroundImage = `url("${background.replaceAll('"', "%22")}")`;
      node.style.backgroundRepeat =
        node.dataset.canvasBackgroundRepeat ?? "no-repeat";
      node.style.backgroundSize = node.dataset.canvasBackgroundSize ?? "cover";
    }
  }
  for (const edge of world.querySelectorAll<SVGLineElement>(
    "[data-canvas-edge-color]",
  )) {
    const color = edge.dataset.canvasEdgeColor;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) edge.style.stroke = color;
  }
}
