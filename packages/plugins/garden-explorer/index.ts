import { definePlugin } from "@riebeckite/core";

export { default as GardenExplorer } from "./components/garden-explorer";
export type {
  GardenExplorerData,
  GardenExplorerEdge,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerTag,
} from "./src/garden-explorer";
export { getGardenExplorerData } from "./src/garden-explorer.server";

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
  });
}
