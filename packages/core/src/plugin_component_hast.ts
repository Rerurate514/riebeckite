import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import type { Node } from "unist";
import type {
  PluginComponentResolveContext,
  PluginHastComponent,
  PluginHastNode,
} from "./types/plugin_component.js";

const serializer = unified().use(rehypeStringify);

const EMPTY_CONTEXT: PluginComponentResolveContext = {
  resolveAssetUrl: () => null,
};

export function renderHastComponents(
  components: readonly PluginHastComponent[],
  context: PluginComponentResolveContext = EMPTY_CONTEXT,
) {
  return async (tree: Node) => {
    await replaceHastComponents(tree, components, context);
  };
}

async function replaceHastComponents(
  node: Node,
  components: readonly PluginHastComponent[],
  context: PluginComponentResolveContext,
): Promise<void> {
  const parent = node as PluginHastNode;
  if (!parent.children) return;

  for (const [index, child] of parent.children.entries()) {
    const hastChild = child as PluginHastNode;
    const component = components.find((candidate) =>
      candidate.match(hastChild),
    );
    if (component) {
      const html = serialize(hastChild);
      const children = serialize({
        type: "root",
        children: hastChild.children ?? [],
      });
      const rendered = await component.render(
        { node: hastChild, html, children },
        context,
      );
      parent.children[index] = { type: "raw", value: rendered };
      continue;
    }
    await replaceHastComponents(child, components, context);
  }
}

function serialize(node: Node | PluginHastNode): string {
  return serializer.stringify(node as never);
}
