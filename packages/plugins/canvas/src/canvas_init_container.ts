import { enableViewer } from "./canvas_init_viewer.js";
import { buildCanvasLayout, parseCanvas } from "./parse.js";
import type { CanvasLayout } from "./types.js";

export function initContainer(container: HTMLElement): void {
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
  applyLayoutStyles(world, layout);
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

function applyLayoutStyles(world: HTMLElement, layout: CanvasLayout): void {
  world.style.width = `${layout.width}px`;
  world.style.height = `${layout.height}px`;
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  for (const element of world.querySelectorAll<HTMLElement>(
    "[data-canvas-node-id]",
  )) {
    const node = nodes.get(element.dataset.canvasNodeId ?? "");
    if (!node) continue;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.width = `${node.width}px`;
    element.style.height = `${node.height}px`;
    element.style.zIndex = String(node.zIndex);
  }
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
