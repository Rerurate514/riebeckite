import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import {
  DEFAULT_TEXT_FRAGMENT_LABELS,
  type TextFragmentLabels,
} from "./src/text-fragment.client.js";

export {
  DEFAULT_TEXT_FRAGMENT_LABELS,
  initTextFragmentShare,
  type TextFragmentLabels,
} from "./src/text-fragment.client.js";
export {
  buildQuoteMarkdown,
  buildTextFragmentUrl,
  encodeTextFragment,
  type TextFragmentOptions,
} from "./src/text-fragment.js";

export type TextFragmentPluginOptions = {
  labels?: Partial<TextFragmentLabels>;
};

/**
 * Registers the client-only text fragment share plugin: a selection popover
 * that copies a `#:~:text=` deep link or a Markdown quote.
 */
export function textFragmentPlugin(
  options: TextFragmentPluginOptions = {},
): RiebeckitePlugin {
  return definePlugin({
    name: "text-fragment",
    assets: [createStyleAsset("text-fragment")],
    clientEntries: [
      createClientEntry("text-fragment", "initTextFragmentShare", {
        ...DEFAULT_TEXT_FRAGMENT_LABELS,
        ...options.labels,
      }),
    ],
  });
}
