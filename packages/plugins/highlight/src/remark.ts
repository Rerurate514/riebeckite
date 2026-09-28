import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { Content, Html, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import type { HighlightOptions } from "./types.js";

const DEFAULT_CLASS_NAME = "rb-highlight";
const DEFAULT_TAG = "mark";

/**
 * Matches `==highlight==` spans that stay on a single line. The capture group
 * must contain at least one character; whitespace-only spans are dropped after
 * matching.
 */
const HIGHLIGHT_PATTERN = /==([^=\n]+?)==/g;

/** Parent node types whose text must never be rewritten. */
const SKIPPED_PARENT_TYPES = new Set([
  "code",
  "inlineCode",
  "html",
  "yaml",
  "toml",
]);

const TAG_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*$/;

export function remarkHighlight(options: HighlightOptions = {}) {
  const className = options.className ?? DEFAULT_CLASS_NAME;
  const tag = resolveTag(options.tag);

  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (SKIPPED_PARENT_TYPES.has(parent.type)) return;
      if (!node.value.includes("==")) return;

      const newNodes = splitHighlights(node.value, className, tag);
      if (!newNodes) return;

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length;
    });
  };
}

/** Splits one text value into plain text and highlight HTML nodes. */
function splitHighlights(
  value: string,
  className: string,
  tag: string,
): Content[] | null {
  const newNodes: Content[] = [];
  let lastIndex = 0;
  let matched = false;

  const highlightRe = new RegExp(HIGHLIGHT_PATTERN.source, "g");
  for (
    let match = highlightRe.exec(value);
    match !== null;
    match = highlightRe.exec(value)
  ) {
    const [full, highlighted] = match;
    if (highlighted.trim().length === 0) continue;

    const start = match.index;
    if (start > lastIndex) {
      newNodes.push({
        type: "text",
        value: value.slice(lastIndex, start),
      });
    }

    newNodes.push(createHighlightNode(highlighted, className, tag));
    lastIndex = start + full.length;
    matched = true;
  }

  if (!matched) return null;
  if (lastIndex < value.length) {
    newNodes.push({ type: "text", value: value.slice(lastIndex) });
  }
  return newNodes;
}

function createHighlightNode(
  value: string,
  className: string,
  tag: string,
): Html {
  return {
    type: "html",
    value: `<${tag} class="${escapeHtmlAttribute(className)}">${escapeHtml(value)}</${tag}>`,
  };
}

/** Falls back to `mark` if a non-tag value somehow reaches the transformer. */
function resolveTag(tag: string | undefined): string {
  return tag && TAG_NAME_PATTERN.test(tag) ? tag : DEFAULT_TAG;
}
