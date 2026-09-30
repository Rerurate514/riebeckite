import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type RiebeckitePlugin,
} from "@riebeckite/core";

export { initTextFragmentShare } from "./src/text-fragment.client.js";
export {
  buildQuoteMarkdown,
  buildTextFragmentUrl,
  encodeTextFragment,
  type TextFragmentOptions,
} from "./src/text-fragment.js";

/**
 * Registers the client-only text fragment share plugin: a selection popover
 * that copies a `#:~:text=` deep link or a Markdown quote.
 */
export function textFragmentPlugin(): RiebeckitePlugin {
  return definePlugin({
    name: "text-fragment",
    assets: [createStyleAsset("text-fragment")],
    clientEntries: [
      createClientEntry("text-fragment", "initTextFragmentShare"),
    ],
  });
}
