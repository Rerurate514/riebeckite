import { definePlugin } from "@riebeckite/core";
import { getGardenExplorerData } from "./src/garden-explorer.server.js";
import { renderGardenExplorerPage } from "./src/garden-explorer-page.js";

export { default as GardenExplorer } from "./components/garden-explorer.js";
export type {
  GardenExplorerData,
  GardenExplorerEdge,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerTag,
} from "./src/garden-explorer.js";
export { getGardenExplorerData } from "./src/garden-explorer.server.js";

export function gardenExplorerPlugin() {
  return definePlugin({
    name: "garden-explorer",
    assets: [
      {
        pluginName: "garden-explorer",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-garden-explorer/style.css",
      },
    ],
    pageTypes: [
      {
        id: "garden-explorer",
        paths: ["/explore"],
        resolve: ({ pathname, manifest, config }) => {
          if (pathname !== "/explore" || !config) return null;
          const siteTitle = config.site.title;
          return {
            type: "garden-explorer",
            pathname,
            title: "Garden Explorer",
            description:
              "Explore notes through links, backlinks, tags, and folders.",
            body: renderGardenExplorerPage(
              getGardenExplorerData({
                manifest,
                config,
                resolveTitle: (slug, title) =>
                  typeof title === "string" && title.trim() ? title : slug,
              }),
              siteTitle,
            ),
          };
        },
      },
    ],
  });
}
