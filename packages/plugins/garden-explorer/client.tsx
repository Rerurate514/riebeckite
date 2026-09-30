import { hydrateRoot } from "hono/jsx/dom/client";
import GardenExplorer from "./components/garden-explorer.js";
import type { GardenExplorerData } from "./src/garden-explorer.js";

const ROOT_SELECTOR = "[data-riebeckite-garden-explorer]";
const DATA_ID = "riebeckite-garden-explorer-data";

/** Hydrates Garden Explorer only when its Page Type is present in the document. */
export default function initGardenExplorer(): void {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  const dataElement = document.getElementById(DATA_ID);
  if (!root || !dataElement?.textContent) return;

  const data = parseData(dataElement.textContent);
  if (!data) return;
  hydrateRoot(root, <GardenExplorer data={data} />);
}

function parseData(value: string): GardenExplorerData | null {
  try {
    return JSON.parse(value) as GardenExplorerData;
  } catch {
    return null;
  }
}
