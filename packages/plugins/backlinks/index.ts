import { definePlugin } from "@riebeckite/core";

export { default as Backlinks } from "./components/backlinks.js";
export type { ArticleBacklink } from "./src/backlinks.js";
export { getPublishedBacklinks } from "./src/backlinks.server.js";

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
