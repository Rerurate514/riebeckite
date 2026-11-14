import { initContainer } from "./canvas_init_container.js";

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
