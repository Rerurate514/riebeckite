import { buildCanvasLayout, parseCanvas } from "./parse.js";
import type {
  CanvasLayout,
  CanvasLayoutEdge,
  CanvasLayoutNode,
} from "./types.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function initCanvas(root: ParentNode = document): void {
  const containers = root.querySelectorAll<HTMLElement>(
    '[data-canvas-render="client"], [data-canvas-render="both"]',
  );
  for (const container of Array.from(containers)) {
    initContainer(container);
  }
}

function initContainer(container: HTMLElement): void {
  const payload = container.querySelector<HTMLScriptElement>(
    "script[data-canvas-payload]",
  );
  const stage = container.querySelector<HTMLElement>(".rb-canvas__stage");
  if (!payload?.textContent || !stage) return;

  const parsed = parseCanvas(payload.textContent);
  if (!parsed) return;

  const maxNodes = readMaxNodes(container);
  const nodes = maxNodes > 0 ? parsed.nodes.slice(0, maxNodes) : parsed.nodes;
  const layout = buildCanvasLayout({ nodes, edges: parsed.edges });

  stage.replaceChildren(buildViewport(container, layout));
  enablePanZoom(stage);
  container.dataset.canvasRender = "ready";
}

function buildViewport(
  container: HTMLElement,
  layout: CanvasLayout,
): HTMLElement {
  const viewport = create("div", "rb-canvas__viewport");
  viewport.style.width = `${layout.width}px`;
  viewport.style.height = `${layout.height}px`;

  if (layout.edges.length > 0) viewport.append(buildEdges(layout));
  for (const node of layout.nodes) viewport.append(buildNode(container, node));
  return viewport;
}

function buildEdges(layout: CanvasLayout): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "rb-canvas__edges");
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute("aria-hidden", "true");
  for (const edge of layout.edges) svg.append(buildEdge(edge));
  return svg;
}

function buildEdge(edge: CanvasLayoutEdge): SVGLineElement {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "rb-canvas__edge");
  line.setAttribute("x1", String(edge.x1));
  line.setAttribute("y1", String(edge.y1));
  line.setAttribute("x2", String(edge.x2));
  line.setAttribute("y2", String(edge.y2));
  return line;
}

function buildNode(
  container: HTMLElement,
  node: CanvasLayoutNode,
): HTMLElement {
  const card = create("div", `rb-canvas__node rb-canvas__node--${node.type}`);
  card.dataset.canvasNodeId = node.id;
  card.style.left = `${node.x}px`;
  card.style.top = `${node.y}px`;
  card.style.width = `${node.width}px`;
  card.style.height = `${node.height}px`;
  if (node.color) card.dataset.canvasColor = node.color;
  card.append(buildNodeBody(container, node));
  return card;
}

function buildNodeBody(
  container: HTMLElement,
  node: CanvasLayoutNode,
): HTMLElement {
  if (node.type === "group") {
    const label = create("div", "rb-canvas__node-label");
    label.textContent = node.label ?? "Group";
    return label;
  }
  if (node.type === "text") {
    const body = create("div", "rb-canvas__node-text");
    body.textContent = node.text ?? "";
    return body;
  }
  if (node.type === "link") {
    const link = create("a", "rb-canvas__node-link");
    link.setAttribute("href", node.url ?? "#");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.textContent = node.label ?? node.url ?? "Link";
    return link;
  }

  const label = node.label ?? fileName(node.file ?? "");
  const href = node.file ? findStaticHref(container, node.id) : null;
  if (href) {
    const link = create("a", "rb-canvas__node-link");
    link.setAttribute("href", href);
    link.textContent = label;
    return link;
  }
  const fallback = create("span", "rb-canvas__node-label");
  fallback.textContent = label || "File";
  return fallback;
}

function findStaticHref(container: HTMLElement, id: string): string | null {
  const cards = container.querySelectorAll<HTMLElement>(
    ".rb-canvas__static [data-canvas-node-id]",
  );
  for (const card of Array.from(cards)) {
    if (card.dataset.canvasNodeId === id) {
      return card.querySelector("a")?.getAttribute("href") ?? null;
    }
  }
  return null;
}

function enablePanZoom(stage: HTMLElement): void {
  const viewport = stage.querySelector<HTMLElement>(".rb-canvas__viewport");
  if (!viewport) return;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  const apply = () => {
    viewport.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.min(4, Math.max(0.25, scale * factor));
      apply();
    },
    { passive: false },
  );

  stage.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    translateX = event.clientX - startX;
    translateY = event.clientY - startY;
    apply();
  });

  const stop = (event: PointerEvent) => {
    dragging = false;
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  };
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
}

function readMaxNodes(container: HTMLElement): number {
  const value = Number(container.dataset.canvasMaxNodes);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function create<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function fileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}
