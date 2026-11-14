import type { Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import {
  bibliographyPathGroups,
  loadBibliographies,
} from "./citations_load.js";
import { prepareTree, readFrontmatter } from "./citations_prepare.js";
import {
  createReferencesHeading,
  createReferencesList,
} from "./citations_render.js";
import {
  createRenderContext,
  transformTextNode,
} from "./citations_transform.js";
import type { MarkdownFile, Parent } from "./citations_types.js";
import type { RemarkCitationsOptions } from "./types.js";

export function remarkCitations(options: RemarkCitationsOptions) {
  return async (tree: Root, file: MarkdownFile) => {
    const blocked = new WeakSet<object>();
    prepareTree(tree, blocked);

    const paths = bibliographyPathGroups(options, readFrontmatter(file));
    const bibliography = await loadBibliographies(paths, options);
    const context = createRenderContext(options, bibliography.entries);

    visit(
      tree,
      "text",
      (node: Text, index: number | undefined, parent: Parent | undefined) => {
        if (index === undefined || !parent?.children) return;
        if (blocked.has(node)) return;
        const replacement = transformTextNode(node, context);
        if (replacement.length === 1 && replacement[0] === node) return;
        parent.children.splice(index, 1, ...replacement);
        return index + replacement.length;
      },
    );

    if (context.orderedKeys.length > 0) {
      tree.children.push(createReferencesHeading(options.referencesHeading));
      tree.children.push(createReferencesList(context));
    }
  };
}
