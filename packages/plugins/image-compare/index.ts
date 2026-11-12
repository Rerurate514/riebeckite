import {
  createStyleAsset,
  definePlugin,
  definePluginComponent,
} from "@riebeckite/core";
import type { ImageCompareComponentProps } from "./src/compare.js";
import { renderImageCompare } from "./src/compare.js";
import { collectImageCompareDiagnostics } from "./src/diagnostics.js";
import { parseImageCompareSpec } from "./src/parse.js";
import { remarkImageCompare } from "./src/remark.js";
import type { ImageCompareOptions } from "./src/types.js";

export {
  IMAGE_COMPARE_CLASS,
  IMAGE_COMPARE_ERROR_ATTRIBUTE,
  ImageCompare,
  type ImageCompareComponentProps,
  renderImageCompare,
  renderImageCompareError,
} from "./src/compare.js";
export { collectImageCompareDiagnostics } from "./src/diagnostics.js";
export { parseImageCompare, parseImageCompareSpec } from "./src/parse.js";
export { remarkImageCompare } from "./src/remark.js";
export type {
  ImageCompareOptions,
  ImageCompareOrientation,
  ImageCompareParseResult,
  ImageCompareSpec,
  ResolvedImageCompareSpec,
} from "./src/types.js";

export const IMAGE_COMPARE_PLUGIN_NAME = "image-compare";
export const IMAGE_COMPARE_COMPONENT = "ImageCompare";

export function imageCompare(options: ImageCompareOptions = {}) {
  const resolved = { language: options.language ?? "image-compare" };

  return definePlugin({
    name: IMAGE_COMPARE_PLUGIN_NAME,
    processedContentCache: {
      version: "image-compare-v2",
      dependencyMode: "none",
    },
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkImageCompare, { language: resolved.language });
    },
    components: [
      definePluginComponent({
        name: IMAGE_COMPARE_COMPONENT,
        parseProps(props): ImageCompareComponentProps {
          const parsed = parseImageCompareSpec(props);
          if ("reason" in parsed)
            return { status: "error", message: parsed.reason };
          return { status: "ready", ...parsed.spec };
        },
        resolveProps(props, context): ImageCompareComponentProps {
          if (props.status === "error") return props;
          const before = context.resolveAssetUrl(props.before);
          const after = context.resolveAssetUrl(props.after);
          if (!before || !after) {
            return {
              status: "error",
              message: `references an unsupported image: "${!before ? props.before : props.after}".`,
            };
          }
          return { ...props, before: before.url, after: after.url };
        },
        render: renderImageCompare,
        client: {
          moduleSpecifier: "@riebeckite/plugin-image-compare/client",
          exportName: "ImageCompare",
        },
      }),
    ],
    onManifestCreated: (context) => {
      collectImageCompareDiagnostics(context.manifest, context.diagnostics);
    },
    assets: [
      createStyleAsset(
        IMAGE_COMPARE_PLUGIN_NAME,
        "@riebeckite/plugin-image-compare/style.css",
      ),
    ],
  });
}

export type { ImageCompareComponentProps as ImageCompareProps };
