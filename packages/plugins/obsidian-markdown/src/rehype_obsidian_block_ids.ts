type HastNode = {
  type: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * Applies Obsidian block ids after sanitization.
 *
 * The sanitize step prefixes `id` attributes to keep untrusted HTML from
 * clobbering the document, so block anchors have to be assigned after it runs.
 * Embedded notes are sanitized again by the parent document, which re-applies
 * the prefix; the `data-block-id` attribute survives that pass and restores the
 * plain anchor.
 */
export function rehypeObsidianBlockIds() {
  return (tree: HastNode) => {
    applyBlockIds(tree, new Set());
  };
}

function applyBlockIds(node: HastNode, used: Set<string>): void {
  if (node.type === "element") {
    const blockId = node.properties?.dataBlockId;
    if (typeof blockId === "string" && blockId) {
      let id = blockId;
      for (let suffix = 1; used.has(id); suffix += 1) {
        id = `${blockId}-${suffix}`;
      }
      used.add(id);
      node.properties = { ...node.properties, id };
    }
  }

  for (const child of node.children ?? []) applyBlockIds(child, used);
}
