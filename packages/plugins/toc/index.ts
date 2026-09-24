import { definePlugin } from "@riebeckite/core";

export type { TableOfContentsItem } from "./components/table-of-contents";
export {
  default as TableOfContents,
  extractTableOfContents,
} from "./components/table-of-contents";
export { initTableOfContents } from "./src/table-of-contents.client";

export function tocPlugin() {
  return definePlugin({
    name: "toc",
    assets: [
      {
        pluginName: "toc",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-toc/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "toc",
        moduleSpecifier: "@riebeckite/plugin-toc/client",
        exportName: "initTableOfContents",
      },
    ],
  });
}
