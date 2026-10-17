import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export { default as TableOfContents } from "./components/table-of-contents.js";
export { initTableOfContents } from "./src/table-of-contents.client.js";
export type { TableOfContentsItem } from "./src/table-of-contents.js";
export { extractTableOfContents } from "./src/table-of-contents.js";

export function tocPlugin() {
  return definePlugin({
    name: "toc",
    assets: [createStyleAsset("toc", "@riebeckite/plugin-toc/style.css")],
    clientEntries: [
      createClientEntry(
        "toc",
        "@riebeckite/plugin-toc/client",
        "initTableOfContents",
      ),
    ],
  });
}
