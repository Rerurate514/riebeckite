import { definePlugin } from "@riebeckite/core";

export { default as Backlinks } from "./components/backlinks";
export type { ArticleBacklink } from "./src/backlinks";
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
