type MdastNode = {
  type?: string;
  meta?: unknown;
  data?: Record<string, unknown>;
  children?: MdastNode[];
};

export function remarkCodeMeta() {
  return (tree: unknown): void => {
    visitMdast(tree as MdastNode, (node) => {
      if (node.type !== "code") return;
      if (typeof node.meta !== "string" || node.meta.trim() === "") return;
      node.data = {
        ...(node.data ?? {}),
        hProperties: {
          ...(node.data?.hProperties as Record<string, unknown> | undefined),
          "data-meta": node.meta,
        },
      };
    });
  };
}

function visitMdast(node: MdastNode, visitor: (node: MdastNode) => void) {
  visitor(node);
  for (const child of node.children ?? []) visitMdast(child, visitor);
}
