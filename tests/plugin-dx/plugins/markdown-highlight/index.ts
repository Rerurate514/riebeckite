import { definePlugin, type RiebeckitePlugin } from "@riebeckite/core";
import type { Html, Parent, Root, RootContent, Text } from "mdast";
import { visit } from "unist-util-visit";

export type HighlightOptions = {
  className?: string;
};

const HIGHLIGHT_PATTERN = /==([^=\n]+)==/g;

function transform(tree: Root, options: HighlightOptions): void {
  visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
    if (index === undefined || parent === undefined) {
      return;
    }
    const value = node.value;
    if (!value.includes("==")) {
      return;
    }
    const className = options.className ? ` class="${options.className}"` : "";
    const replacement: RootContent[] = [];
    let last = 0;
    HIGHLIGHT_PATTERN.lastIndex = 0;
    let match = HIGHLIGHT_PATTERN.exec(value);
    while (match !== null) {
      if (match.index > last) {
        replacement.push({
          type: "text",
          value: value.slice(last, match.index),
        } satisfies Text);
      }
      replacement.push({
        type: "html",
        value: `<mark${className}>${match[1]}</mark>`,
      } satisfies Html);
      last = match.index + match[0].length;
      match = HIGHLIGHT_PATTERN.exec(value);
    }
    if (last === 0) {
      return;
    }
    if (last < value.length) {
      replacement.push({
        type: "text",
        value: value.slice(last),
      } satisfies Text);
    }
    (parent.children as RootContent[]).splice(index, 1, ...replacement);
  });
}

export function markdownHighlightPlugin(
  options: HighlightOptions = {},
): RiebeckitePlugin<HighlightOptions> {
  return definePlugin({
    name: "markdown-highlight",
    options,
    remarkPlugins: [() => (tree: Root) => transform(tree, options)],
  });
}
