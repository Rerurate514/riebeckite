type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

export function createExcalidrawRehypePlugin(embeds: Map<string, string>) {
  return () => (tree: unknown) => {
    replaceExcalidrawEmbeds(tree as HastNode, embeds);
  };
}

export function replaceExcalidrawEmbeds(
  node: HastNode,
  embeds: Map<string, string>,
): void {
  const children = node.children;
  if (!children) return;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.tagName === "span") {
      const id =
        child.properties?.dataExcalidrawEmbed ??
        child.properties?.["data-excalidraw-embed"];
      if (typeof id === "string") {
        const html = embeds.get(id);
        embeds.delete(id);
        if (html) {
          children[index] = { type: "raw", value: html };
        } else {
          children.splice(index, 1);
          index -= 1;
        }
        continue;
      }
    }
    replaceExcalidrawEmbeds(child, embeds);
  }
}
