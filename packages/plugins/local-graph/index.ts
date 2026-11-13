import { createClientEntry, definePlugin } from "@riebeckite/core";
import { buildGraphEdges, layoutRadialGraph } from "@riebeckite/core/client";

export {
  default as LocalGraph,
  LocalGraphView,
} from "./components/local-graph.js";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
  LocalGraphViewProps,
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
    clientEntries: [
      createClientEntry("local-graph", {
        moduleSpecifier: "@riebeckite/plugin-local-graph/client",
        presenceSelector: "[data-riebeckite-local-graph]",
      }),
    ],
  });
}
