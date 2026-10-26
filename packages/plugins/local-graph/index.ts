import { definePlugin } from "@riebeckite/core";
import { buildGraphEdges, layoutRadialGraph } from "@riebeckite/core/client";

export type { LocalGraphProps } from "./components/local-graph.js";
export { default as LocalGraph } from "./components/local-graph.js";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
} from "./src/local-graph.js";
export {
  buildLocalGraph,
  getLocalGraph,
} from "./src/local-graph.server.js";
export { buildGraphEdges, layoutRadialGraph };

export type LocalGraphOptions = Record<never, never>;

export function localGraph(options: LocalGraphOptions = {}) {
  return definePlugin({
    name: "local-graph",
    order: 400,
    options,
    assets: [
      {
        pluginName: "local-graph",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-local-graph/style.css",
      },
    ],
  });
}
