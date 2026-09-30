import { renderToString } from "hono/jsx/dom/server";
import type { GardenExplorerData } from "./garden-explorer.js";
import GardenExplorer from "../components/garden-explorer.js";

export function renderGardenExplorerPage(
  data: GardenExplorerData,
  siteTitle: string,
): string {
  return renderToString(
    <main class="garden-explorer-page">
      <header class="garden-explorer-page__header">
        <p class="garden-explorer-page__eyebrow">{siteTitle}</p>
        <h1 class="garden-explorer-page__title">Garden Explorer</h1>
        <p class="garden-explorer-page__description">
          Graph, Search, Tags, Folders, Backlinks, and Related Notes を横断して
          Digital Garden を探索できます。
        </p>
      </header>
      <GardenExplorer data={data} />
    </main>,
  );
}
