import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkMetaBind } from "./src/remark.js";

export { parseMetaBind } from "./src/parse.js";
export { remarkMetaBind } from "./src/remark.js";
export { initMetaBind } from "./src/runtime.js";
export type { MetaBindModel, MetaBindParseResult } from "./src/types.js";

export function metaBind() {
  return definePlugin({
    name: "meta-bind",
    processedContentCache: { version: "meta-bind-v1", dependencyMode: "none" },
    extendMarkdownPipeline: (pipeline) => pipeline.use(remarkMetaBind),
    assets: [
      createStyleAsset("meta-bind", "@riebeckite/plugin-meta-bind/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        "meta-bind",
        "@riebeckite/plugin-meta-bind/client",
        "initMetaBind",
        undefined,
        "page",
        "context",
        "[data-meta-bind]",
      ),
    ],
  });
}
