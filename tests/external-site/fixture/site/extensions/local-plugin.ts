import { definePlugin } from "@riebeckite/core";

/**
 * Marker rendered by the site-local plugin so the E2E build can assert that a
 * plugin defined inside the site itself is resolved and applied through the same
 * contract as an installed `@riebeckite/plugin-*` package.
 */
export const LOCAL_PLUGIN_MARKER = "RIEBECKITE_EXTERNAL_LOCAL_PLUGIN_MARKER";

/**
 * Minimal local hast shape so this fixture does not depend on transitive
 * `unified`/`hast` types that are not part of the public contract.
 */
type LocalHastNode =
  | {
      type: string;
      tagName?: string;
      properties?: Record<string, unknown>;
      children?: LocalHastNode[];
    }
  | { type: "text"; value: string }
  | { type: string; [key: string]: unknown };

type LocalHastRoot = {
  type: string;
  children?: LocalHastNode[];
};

function rehypeLocalPluginMarker() {
  return (tree: LocalHastRoot) => {
    if (!Array.isArray(tree.children)) return;
    tree.children.push({
      type: "element",
      tagName: "div",
      properties: {
        className: ["fixture-local-plugin"],
        "data-local-plugin-marker": LOCAL_PLUGIN_MARKER,
      },
      children: [{ type: "text", value: LOCAL_PLUGIN_MARKER }],
    });
  };
}

export function localFixturePlugin() {
  return definePlugin({
    name: "fixture-local",
    provides: ["fixture.local"],
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeLocalPluginMarker);
    },
    assets: [
      {
        pluginName: "fixture-local",
        kind: "style",
        moduleSpecifier: "/extensions/local-plugin.css",
      },
    ],
  });
}
