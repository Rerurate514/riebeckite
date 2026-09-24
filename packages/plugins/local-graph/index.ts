import { definePlugin } from "@riebeckite/core";

export { default as LocalGraph } from "./components/local-graph";
export { buildGraphEdges, layoutRadialGraph } from "./src/graph";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
} from "./src/local-graph";
export { getLocalGraph } from "./src/local-graph.server";

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
