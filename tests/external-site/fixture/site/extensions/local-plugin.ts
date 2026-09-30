import { definePlugin } from "@riebeckite/core";

export const LOCAL_PLUGIN_MARKER = "RIEBECKITE_EXTERNAL_LOCAL_PLUGIN_MARKER";
export const LOCAL_PLUGIN_PAGE_MARKER =
  "RIEBECKITE_EXTERNAL_PLUGIN_PAGE_MARKER";

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
    pageTypes: [
      {
        id: "fixture-local-page",
        paths: ["/plugin-page"],
        resolve: ({ pathname }) =>
          pathname === "/plugin-page"
            ? {
                type: "fixture-local-page",
                pathname,
                title: "External plugin page",
                body: `<main data-plugin-page="${LOCAL_PLUGIN_PAGE_MARKER}">${LOCAL_PLUGIN_PAGE_MARKER}</main>`,
              }
            : null,
      },
    ],
  });
}
