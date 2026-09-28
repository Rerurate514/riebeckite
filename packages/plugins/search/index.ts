import {
  createClientEntry,
  createStyleAsset,
  defineEndpoint,
  definePlugin,
} from "@riebeckite/core";
import { buildSearchItems } from "./src/search-index.server.js";

export { default as SearchBar } from "./components/search-bar.js";
export * from "./src/search.js";
export { initSearch } from "./src/search-bar.client.js";
export { buildSearchItems } from "./src/search-index.server.js";

export function searchPlugin() {
  return definePlugin({
    name: "search",
    assets: [createStyleAsset("search")],
    clientEntries: [createClientEntry("search", "initSearch")],
    endpoints: [
      defineEndpoint(
        "/search-data.json",
        ({ config, manifest }) => ({
          json: buildSearchItems({ manifest, config }),
        }),
        { cacheControl: "public, max-age=300" },
      ),
    ],
  });
}
