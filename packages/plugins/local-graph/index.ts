import {
  buildGraphEdges,
  definePlugin,
  layoutRadialGraph,
} from "@riebeckite/core";

export { default as LocalGraph } from "./components/local-graph.js";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
} from "./src/local-graph.js";
export { getLocalGraph } from "./src/local-graph.server.js";
export { buildGraphEdges, layoutRadialGraph };

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
