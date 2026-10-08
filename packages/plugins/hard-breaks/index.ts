import { definePlugin } from "@riebeckite/core";
import remarkBreaks from "remark-breaks";

export function hardBreaks() {
  return definePlugin({
    name: "hard-breaks",
    processedContentCache: {
      version: "hard-breaks-v1",
      dependencyMode: "none",
    },
    remarkPlugins: [remarkBreaks],
  });
}

/** Alias kept for parity with plugins that export a `…Plugin` factory. */
export const hardBreaksPlugin = hardBreaks;
