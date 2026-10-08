import {
  appendContentBodySlot,
  buildGraphEdges,
  type ConfigValidationIssue,
  definePlugin,
  layoutRadialGraph,
} from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import LocalGraph from "./components/local-graph.js";
import { getLocalGraph } from "./src/local-graph.server.js";

export { default as LocalGraph } from "./components/local-graph.js";
export type {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphNodeRelation,
} from "./src/local-graph.js";
export { getLocalGraph } from "./src/local-graph.server.js";
export { buildGraphEdges, layoutRadialGraph };

export type LocalGraphOptions = {
  render?: boolean;
};

export function localGraphPlugin(options: LocalGraphOptions = {}) {
  return definePlugin({
    name: "local-graph",
    order: 400,
    options,
    validateOptions: validateLocalGraphOptions,
    onManifestCreated: ({ config, manifest }) => {
      if (options.render === false) return;
      if (!config) return;
      for (const entry of manifest.discoverableEntries) {
        const graph = getLocalGraph({
          manifest,
          config,
          slug: entry.slug,
          resolveTitle,
        });
        if (!graph || graph.nodes.length <= 1) continue;
        appendContentBodySlot(
          entry,
          "article.footer",
          renderToString(LocalGraph({ graph })),
        );
      }
    },
    assets: [
      {
        pluginName: "local-graph",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-local-graph/style.css",
      },
    ],
  });
}

function validateLocalGraphOptions(
  options: LocalGraphOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (
    !options ||
    options.render === undefined ||
    typeof options.render === "boolean"
  ) {
    return [];
  }
  return [{ path: "render", message: "Expected a boolean." }];
}

function resolveTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim()) return title;
  return slug.split("/").at(-1) ?? slug;
}
