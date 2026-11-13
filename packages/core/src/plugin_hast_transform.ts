import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import type { Node } from "unist";
import type {
  PluginHastNode,
  PluginHastTransform,
  PluginMarkdownComponentResolveContext,
} from "./types/plugin_component.js";

const serializer = unified().use(rehypeStringify);

const EMPTY_CONTEXT: PluginMarkdownComponentResolveContext = {
  resolveAssetUrl: () => null,
};

export function renderHastTransforms(
  transforms: readonly PluginHastTransform[],
  context: PluginMarkdownComponentResolveContext = EMPTY_CONTEXT,
) {
  return async (tree: Node) => {
    await replaceHastTransforms(tree, transforms, context);
  };
}

async function replaceHastTransforms(
  node: Node,
  transforms: readonly PluginHastTransform[],
  context: PluginMarkdownComponentResolveContext,
): Promise<void> {
  const parent = node as PluginHastNode;
  if (!parent.children) return;

  for (const [index, child] of parent.children.entries()) {
    const hastChild = child as PluginHastNode;
    const transform = transforms.find((candidate) =>
      candidate.match(hastChild),
    );
    if (transform) {
      const html = serialize(hastChild);
      const children = serialize({
        type: "root",
        children: hastChild.children ?? [],
      });
      const rendered = await transform.render(
        { node: hastChild, html, children },
        context,
      );
      parent.children[index] = { type: "raw", value: rendered };
      continue;
    }
    await replaceHastTransforms(child, transforms, context);
  }
}

function serialize(node: Node | PluginHastNode): string {
  return serializer.stringify(node as never);
}
