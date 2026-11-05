import { buildCanvasLayout, parseCanvas } from "./parse.js";
import type { CanvasCamera, CanvasLayout } from "./types.js";

const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
const PADDING = 32;

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
  const payload = container.querySelector<HTMLScriptElement>(
    "script[data-canvas-payload]",
  );
  const stage = container.querySelector<HTMLElement>(".rb-canvas__stage");
  const world = container.querySelector<HTMLElement>("[data-canvas-world]");
  if (!payload?.textContent || !stage || !world)
    throw new Error("Canvas markup is incomplete.");
  const document = parseCanvas(payload.textContent);
  if (!document) throw new Error("Canvas payload is invalid.");
  const nodes = limitNodes(document.nodes, container);
  const layout = buildCanvasLayout({ nodes, edges: document.edges });

  stage.replaceChildren(world, buildControls());
  applyDynamicStyles(world);
  enableViewer(stage, world, layout);
}

function limitNodes<T>(nodes: readonly T[], container: HTMLElement): T[] {
  const maximum = Number(container.dataset.canvasMaxNodes);
  return Number.isInteger(maximum) && maximum > 0
    ? nodes.slice(0, maximum)
    : [...nodes];
}

function buildControls(): HTMLElement {
  const controls = document.createElement("div");
  controls.className = "rb-canvas__controls";
  controls.setAttribute("aria-label", "Canvas controls");
  for (const [action, label, icon] of [
    ["zoom-in", "Zoom in", "+"],
    ["zoom-out", "Zoom out", "−"],
    ["fit", "Zoom to fit", "⊡"],
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
  let drag: { pointerId: number; x: number; y: number; moved: boolean } | null =
    null;
  const selected = new Set<string>();
  let animationFrame = 0;

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
    camera = fitCamera(layout, bounds.width, bounds.height);
    scheduleRender();
  };
  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const bounds = stage.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const scale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = scale / camera.scale;
    camera = {
      x: x - (x - camera.x) * ratio,
      y: y - (y - camera.y) * ratio,
      scale,
    };
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

  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(stage);
  stage.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        event.preventDefault();
        zoomAt(
          event.deltaY < 0 ? 1.15 : 1 / 1.15,
          event.clientX,
          event.clientY,
        );
      }
    },
    { passive: false },
  );
  stage.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("a, button, audio, video, input, textarea")) return;
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
    if (!event.shiftKey) {
      selected.clear();
      updateSelection();
    }
    drag = {
      pointerId: event.pointerId,
      x: event.clientX - camera.x,
      y: event.clientY - camera.y,
      moved: false,
    };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.moved = true;
    camera = {
      ...camera,
      x: event.clientX - drag.x,
      y: event.clientY - drag.y,
    };
    scheduleRender();
  });
  const stop = (event: PointerEvent) => {
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
    if (action === "zoom-in")
      zoomAt(
        1.25,
        stage.getBoundingClientRect().left + stage.clientWidth / 2,
        stage.getBoundingClientRect().top + stage.clientHeight / 2,
      );
    if (action === "zoom-out")
      zoomAt(
        0.8,
        stage.getBoundingClientRect().left + stage.clientWidth / 2,
        stage.getBoundingClientRect().top + stage.clientHeight / 2,
      );
    if (action === "fit") fit();
    if (action === "reset") {
      camera = { x: PADDING, y: PADDING, scale: 1 };
      scheduleRender();
    }
  });
}

function fitCamera(
  layout: CanvasLayout,
  width: number,
  height: number,
): CanvasCamera {
  const scale = clamp(
    Math.min(
      (width - PADDING * 2) / Math.max(layout.width, 1),
      (height - PADDING * 2) / Math.max(layout.height, 1),
    ),
    MIN_SCALE,
    1,
  );
  return {
    x: Math.max(PADDING, (width - layout.width * scale) / 2),
    y: Math.max(PADDING, (height - layout.height * scale) / 2),
    scale,
  };
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
