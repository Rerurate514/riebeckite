import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  definePluginComponent,
} from "@riebeckite/core";
import type { CodeCopyProps } from "./src/copy_component.js";
import { renderCodeCopy } from "./src/copy_component.js";
import { DEFAULT_COPIED_LABEL, DEFAULT_COPY_LABEL } from "./src/init.js";
import { rehypeCodeEnhance } from "./src/rehype.js";
import { remarkCodeMeta } from "./src/remark.js";
import type { CodeEnhanceOptions } from "./src/types.js";

export type { CodeCopyProps } from "./src/copy_component.js";
export {
  DEFAULT_COPIED_LABEL,
  DEFAULT_COPY_LABEL,
  initCodeEnhance,
} from "./src/init.js";
export { rehypeCodeEnhance } from "./src/rehype.js";
export { remarkCodeMeta } from "./src/remark.js";
export type {
  CodeEnhanceClientOptions,
  CodeEnhanceOptions,
  CodeEnhanceTheme,
} from "./src/types.js";

export function codeEnhance(options: CodeEnhanceOptions = {}) {
  return definePlugin({
    name: "code-enhance",
    processedContentCache: {
      version: "code-enhance-v3",
      dependencyMode: "none",
    },
    options,
    remarkPlugins: [remarkCodeMeta],
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeEnhance, options);
    },
    components: [
      definePluginComponent({
        name: "CodeCopy",
        parseProps(props) {
          if (typeof props.text !== "string") {
            throw new Error('CodeCopy requires a string "text" prop.');
          }
          if (props.label !== undefined && typeof props.label !== "string") {
            throw new Error('CodeCopy "label" must be a string.');
          }
          if (
            props.copiedLabel !== undefined &&
            typeof props.copiedLabel !== "string"
          ) {
            throw new Error('CodeCopy "copiedLabel" must be a string.');
          }
          return props as CodeCopyProps;
        },
        render: renderCodeCopy,
        client: {
          moduleSpecifier: "@riebeckite/plugin-code-enhance/copy-component",
        },
      }),
    ],
    assets: [
      createStyleAsset(
        "code-enhance",
        "@riebeckite/plugin-code-enhance/style.css",
      ),
    ],
    clientEntries: [
      createClientEntry(
        "code-enhance",
        "@riebeckite/plugin-code-enhance/client",
        "initCodeEnhance",
        {
          copyLabel: options.copyLabel ?? DEFAULT_COPY_LABEL,
          copiedLabel: options.copiedLabel ?? DEFAULT_COPIED_LABEL,
        },
      ),
    ],
  });
}
