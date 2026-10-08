import { escapeScriptJson } from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import GardenExplorer from "../components/garden-explorer.js";
import type { GardenExplorerData } from "./garden-explorer.js";

export function renderGardenExplorerPage(
  data: GardenExplorerData,
  siteTitle: string,
): string {
  return renderToString(
    <div class="garden-explorer-page">
      <header class="garden-explorer-page__header">
        <p class="garden-explorer-page__eyebrow">{siteTitle}</p>
        <h1 class="garden-explorer-page__title">Garden Explorer</h1>
        <p class="garden-explorer-page__description">
          Explore your digital garden across graph, search, tags, folders,
          backlinks, and related notes.
        </p>
      </header>
      <div data-riebeckite-garden-explorer>
        <GardenExplorer data={data} />
      </div>
      <script
        id="riebeckite-garden-explorer-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: escapeScriptJson(JSON.stringify(data)),
        }}
      />
    </div>,
  );
}
