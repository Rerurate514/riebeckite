import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { createQueryPlaceholder } from "./placeholder.js";

export type RemarkQueryOptions = {
  /** Fenced code block language treated as a query. Defaults to `query`. */
  language?: string;
};

/**
 * Replaces fenced `query` code blocks with a build-time placeholder. The block
 * body (YAML) is preserved verbatim inside the placeholder and parsed later,
 * once the content manifest exists.
 *
 * Registered through `pipeline.use(remarkQuery, options)`; the returned
 * function is the unified transformer.
 */
export function remarkQuery(options: RemarkQueryOptions = {}) {
  const language = options.language ?? "query";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: createQueryPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
