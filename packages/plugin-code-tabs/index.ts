import { definePlugin } from "@riebeckite/core";
import { rehypeCodeTabs } from "./src/rehype.js";
import { remarkCodeMeta } from "./src/remark.js";
import type { CodeTabsOptions } from "./src/types.js";

export { initCodeTabs } from "./src/init.js";
export { rehypeCodeTabs } from "./src/rehype.js";
export { remarkCodeMeta } from "./src/remark.js";
export type { CodeTabsClientOptions, CodeTabsOptions } from "./src/types.js";

export function codeTabs(options: CodeTabsOptions = {}) {
  return definePlugin({
    name: "code-tabs",
    options,
    remarkPlugins: [remarkCodeMeta],
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeTabs, options);
    },
    assets: [
      {
        pluginName: "code-tabs",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-code-tabs/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "code-tabs",
        moduleSpecifier: "@riebeckite/plugin-code-tabs/client",
        exportName: "initCodeTabs",
      },
    ],
  });
}
