import {
  createClientEntry,
  createStyleAsset,
  defineEndpoint,
  definePlugin,
} from "@riebeckite/core";
import { buildSearchItems } from "./src/search-index.server.js";

export { default as SearchBar } from "./components/search-bar.js";
export {
  findSmart404Candidates,
  normalizeSearchQuery,
  normalizeSearchText,
  type ParsedSearchQuery,
  parseSearchQuery,
  type SearchField,
  type SearchFilter,
  type SearchItem,
  type SearchMatch,
  type SearchResult,
  type Smart404Candidate,
  searchItems,
  searchQueryFromPath,
} from "./src/search.js";
export { initSearch } from "./src/search-bar.client.js";
export { buildSearchItems } from "./src/search-index.server.js";

export function searchPlugin() {
  return definePlugin({
    name: "search",
    assets: [createStyleAsset("search", "@riebeckite/plugin-search/style.css")],
    clientEntries: [
      createClientEntry(
        "search",
        "@riebeckite/plugin-search/client",
        "initSearch",
        undefined,
        "app",
      ),
    ],
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
