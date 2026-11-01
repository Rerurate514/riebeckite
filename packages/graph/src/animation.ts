import type { GraphNode } from "./types.js";

export type RevealEntry = {
  id: string;
  at: number;
  dated: boolean;
};

export function buildRevealSchedule(
  nodes: readonly GraphNode[],
): RevealEntry[] {
  const dated = nodes
    .filter((node): node is GraphNode & { date: string } => node.date !== null)
    .sort(
      (left, right) =>
        Date.parse(left.date) - Date.parse(right.date) ||
        left.id.localeCompare(right.id),
    );
  const undated = nodes
    .filter((node) => node.date === null)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (dated.length === 0) {
    return [...undated].map((node, index) => ({
      id: node.id,
      at: (index + 1) / Math.max(undated.length, 1),
      dated: false,
    }));
  }

  const datedShare = undated.length === 0 ? 1 : 0.85;
  const entries: RevealEntry[] = dated.map((node, index) => ({
    id: node.id,
    at: ((index + 1) / dated.length) * datedShare,
    dated: true,
  }));
  undated.forEach((node, index) => {
    entries.push({
      id: node.id,
      at: datedShare + ((index + 1) / undated.length) * (1 - datedShare),
      dated: false,
    });
  });
  return entries;
}

export function hasDatedNodes(nodes: readonly GraphNode[]): boolean {
  return nodes.some((node) => node.date !== null);
}
