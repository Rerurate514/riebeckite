import { definePlugin } from "@riebeckite/core";

export type { ArticleBacklink } from "./components/backlinks";
export { default as Backlinks } from "./components/backlinks";
export { getPublishedBacklinks } from "./src/backlinks.server";

export function backlinksPlugin() {
  return definePlugin({
    name: "backlinks",
    assets: [
      {
        pluginName: "backlinks",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-backlinks/style.css",
      },
    ],
  });
}
