import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { codeTabsHastComponent } from "./src/hast_component.js";
import { rehypeCodeTabs } from "./src/rehype.js";
import { remarkCodeMeta } from "./src/remark.js";
import type { CodeTabsOptions } from "./src/types.js";

export { codeTabsHastComponent } from "./src/hast_component.js";
export { initCodeTabs } from "./src/init.js";
export { rehypeCodeTabs } from "./src/rehype.js";
export { remarkCodeMeta } from "./src/remark.js";
export type { CodeTabsClientOptions, CodeTabsOptions } from "./src/types.js";

export function codeTabs(options: CodeTabsOptions = {}) {
  return definePlugin({
    name: "code-tabs",
    processedContentCache: {
      version: "code-tabs-v2",
      dependencyMode: "none",
    },
    options,
    remarkPlugins: [remarkCodeMeta],
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeTabs, options);
    },
    hastComponents: [codeTabsHastComponent],
    assets: [
      createStyleAsset("code-tabs", "@riebeckite/plugin-code-tabs/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        "code-tabs",
        "@riebeckite/plugin-code-tabs/client",
        "initCodeTabs",
        undefined,
        undefined,
        undefined,
        "[data-code-tabs='true']",
      ),
    ],
  });
}
