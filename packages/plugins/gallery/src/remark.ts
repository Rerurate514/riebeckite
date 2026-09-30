import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { createGalleryPlaceholder } from "./placeholder.js";

export type RemarkGalleryOptions = {
  /** Fenced code block language treated as a gallery. Defaults to `gallery`. */
  language?: string;
};

/**
 * Replaces fenced `gallery` code blocks with a build-time placeholder.
 *
 * The block body is only encoded here; it is parsed and rendered once the
 * content manifest exists, so the `gallery` plugin can report diagnostics with
 * the owning slug.
 */
export function remarkGallery(options: RemarkGalleryOptions = {}) {
  const language = options.language ?? "gallery";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: createGalleryPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
