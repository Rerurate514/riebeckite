import { definePlugin } from "@riebeckite/core";

export type { BacklinksProps } from "./components/backlinks.js";
export { default as Backlinks } from "./components/backlinks.js";
export type { ArticleBacklink } from "./src/backlinks.js";
export { getBacklinks, getPublishedBacklinks } from "./src/backlinks.server.js";

export type BacklinksOptions = Record<never, never>;

export function backlinks(options: BacklinksOptions = {}) {
  return definePlugin({
    name: "backlinks",
    order: 500,
    options,
    assets: [
      {
        pluginName: "backlinks",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-backlinks/style.css",
      },
    ],
  });
}
