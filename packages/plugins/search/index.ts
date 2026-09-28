import { definePlugin } from "@riebeckite/core";
import { buildSearchItems } from "./src/search-index.server.js";

export { default as SearchBar } from "./components/search-bar.js";
export * from "./src/search.js";
export { initSearch } from "./src/search-bar.client.js";
export { buildSearchItems } from "./src/search-index.server.js";

export function searchPlugin() {
  return definePlugin({
    name: "search",
    assets: [
      {
        pluginName: "search",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-search/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "search",
        moduleSpecifier: "@riebeckite/plugin-search/client",
        exportName: "initSearch",
      },
    ],
    endpoints: [
      {
        path: "/search-data.json",
        handler: ({ config, manifest }) => ({
          headers: { "Cache-Control": "public, max-age=300" },
          json: buildSearchItems({ manifest, config }),
        }),
      },
    ],
  });
}
