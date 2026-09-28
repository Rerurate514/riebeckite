import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { builtinShortcodeNames, builtinShortcodes } from "./src/builtins.js";
import {
  DEFAULT_SHORTCODE_CLASS_NAME,
  SHORTCODE_CHILDREN_MARKER,
  createShortcodeRenderContext,
  renderShortcode,
  resolveShortcodeOptions,
} from "./src/render.js";
import {
  DIAGNOSTIC_INVALID,
  DIAGNOSTIC_UNKNOWN,
  SHORTCODES_SOURCE,
  remarkShortcodes,
} from "./src/remark.js";
import type { ShortcodeOptions } from "./src/types.js";

export type {
  DirectiveNode,
  RemarkShortcodesOptions,
  ResolvedShortcodeOptions,
  ShortcodeAttributes,
  ShortcodeOptions,
  ShortcodeRenderInput,
  ShortcodeRenderer,
  ShortcodeRenderRequest,
} from "./src/types.js";

export { builtinShortcodeNames, builtinShortcodes };
export {
  DEFAULT_SHORTCODE_CLASS_NAME,
  SHORTCODE_CHILDREN_MARKER,
  createShortcodeRenderContext,
  renderShortcode,
  resolveShortcodeOptions,
};
export {
  DIAGNOSTIC_INVALID,
  DIAGNOSTIC_UNKNOWN,
  SHORTCODES_SOURCE,
  remarkShortcodes,
};

const PLUGIN_NAME = "shortcodes";

export function shortcodes(options: ShortcodeOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    options,
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkShortcodes, {
        ...options,
        contentIndex: context.contentIndex,
        contentSource: context.contentSource,
      });
    },
    assets: [createStyleAsset(PLUGIN_NAME)],
  });
}

export const shortcodesPlugin = shortcodes;
