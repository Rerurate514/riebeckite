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
