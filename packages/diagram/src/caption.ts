import { stringProperty } from "./hast.js";
import type { DiagramBlock, DiagramCaptionStrategy } from "./types.js";

export function resolveDiagramCaption(
  block: DiagramBlock,
  strategies: readonly DiagramCaptionStrategy[] = [],
): string | null {
  const title =
    stringProperty(block.pre, "title") ?? stringProperty(block.code, "title");
  if (title?.trim()) return title.trim();
  for (const strategy of strategies) {
    const caption = strategy(block)?.trim();
    if (caption) return caption;
  }
  return null;
}
