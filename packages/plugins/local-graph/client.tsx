import { hydrateRoot } from "hono/jsx/dom/client";
import { LocalGraphView } from "./components/local-graph-view.js";
import type { LocalGraphData } from "./src/local-graph.js";

type LocalGraphPayload = {
  graph: LocalGraphData;
  showExplorerLink?: boolean;
};

const ROOT_SELECTOR = "[data-riebeckite-local-graph]";
const DATA_ID = "riebeckite-local-graph-data";

export default function initLocalGraph(): void {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  const dataElement = document.getElementById(DATA_ID);
  if (!root || !dataElement?.textContent) return;

  const payload = parseData(dataElement.textContent);
  if (!payload) return;

  hydrateRoot(
    root,
    <LocalGraphView
      graph={payload.graph}
      showExplorerLink={payload.showExplorerLink}
    />,
  );
}

function parseData(value: string): LocalGraphPayload | null {
  try {
    const parsed = JSON.parse(value) as LocalGraphPayload;
    return parsed && Array.isArray(parsed.graph?.nodes) ? parsed : null;
  } catch {
    return null;
  }
}
