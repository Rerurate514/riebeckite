import { hydrateRoot } from "hono/jsx/dom/client";
import { LocalGraphView } from "./components/local-graph-view.js";
import type { LocalGraphData } from "./src/local-graph.js";

const ROOT_SELECTOR = "[data-riebeckite-local-graph]";
const DATA_ID = "riebeckite-local-graph-data";

export default function initLocalGraph(): void {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  const dataElement = document.getElementById(DATA_ID);
  if (!root || !dataElement?.textContent) return;

  const graph = parseData(dataElement.textContent);
  if (!graph) return;
  hydrateRoot(root, <LocalGraphView graph={graph} />);
}

function parseData(value: string): LocalGraphData | null {
  try {
    const parsed = JSON.parse(value) as LocalGraphData;
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch {
    return null;
  }
}
