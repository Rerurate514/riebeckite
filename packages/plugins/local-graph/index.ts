import { definePlugin } from "@riebeckite/core";

export { default as LocalGraph } from "./components/local-graph.js";
export { buildGraphEdges, layoutRadialGraph } from "./src/graph.js";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
} from "./src/local-graph.js";
export { getLocalGraph } from "./src/local-graph.server.js";

export function localGraphPlugin() {
  return definePlugin({
    name: "local-graph",
    assets: [
      {
        pluginName: "local-graph",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-local-graph/style.css",
      },
    ],
  });
}
