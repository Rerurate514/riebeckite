import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { builtinShortcodeNames, builtinShortcodes } from "./src/builtins.js";
import {
  DIAGNOSTIC_INVALID,
  DIAGNOSTIC_UNKNOWN,
  remarkShortcodes,
  SHORTCODES_SOURCE,
} from "./src/remark.js";
import {
  createShortcodeRenderContext,
  DEFAULT_SHORTCODE_CLASS_NAME,
  renderShortcode,
  resolveShortcodeOptions,
  SHORTCODE_CHILDREN_MARKER,
} from "./src/render.js";
import type { ShortcodeOptions } from "./src/types.js";

export type {
  DirectiveNode,
  RemarkShortcodesOptions,
  ResolvedShortcodeOptions,
  ShortcodeAttributes,
  ShortcodeOptions,
  ShortcodeRenderer,
  ShortcodeRenderInput,
  ShortcodeRenderRequest,
} from "./src/types.js";
export {
  builtinShortcodeNames,
  builtinShortcodes,
  createShortcodeRenderContext,
  DEFAULT_SHORTCODE_CLASS_NAME,
  DIAGNOSTIC_INVALID,
  DIAGNOSTIC_UNKNOWN,
  remarkShortcodes,
  renderShortcode,
  resolveShortcodeOptions,
  SHORTCODE_CHILDREN_MARKER,
  SHORTCODES_SOURCE,
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
