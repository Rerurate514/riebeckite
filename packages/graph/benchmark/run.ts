import { performance } from "node:perf_hooks";
import {
  buildVisibleGraph,
  createGraphSimulation,
  DEFAULT_GRAPH_SETTINGS,
  type GraphDocument,
  type GraphLink,
  type GraphNode,
} from "../index.js";

type Density = "low" | "high";

const SIZES = [100, 675, 1000, 3000] as const;
const DENSITIES: readonly Density[] = ["low", "high"];

for (const nodeCount of SIZES) {
  for (const density of DENSITIES) {
    const document = createDocument(nodeCount, density);
    const visibleStart = performance.now();
    const visible = buildVisibleGraph({
      document,
      settings: DEFAULT_GRAPH_SETTINGS,
      mode: "global",
    });
    const visibleMs = performance.now() - visibleStart;

    const heapBefore = process.memoryUsage().heapUsed;
    const createStart = performance.now();
    const simulation = createGraphSimulation({
      nodeIds: visible.nodes.map((node) => node.id),
      links: visible.links,
      options: {
        centerForce: DEFAULT_GRAPH_SETTINGS.centerForce,
        repelForce: DEFAULT_GRAPH_SETTINGS.repelForce,
        linkForce: DEFAULT_GRAPH_SETTINGS.linkForce,
        linkDistance: DEFAULT_GRAPH_SETTINGS.linkDistance,
      },
    });
    const createMs = performance.now() - createStart;

    const tickStart = performance.now();
    let ticks = 0;
    while (ticks < 600 && simulation.tick()) ticks += 1;
    const tickMs = performance.now() - tickStart;
    const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;

    console.log(
      [
        String(nodeCount).padStart(5),
        density.padEnd(5),
        `${visible.links.length}`.padStart(6),
        `${visibleMs.toFixed(2)}ms`.padStart(10),
        `${createMs.toFixed(2)}ms`.padStart(10),
        `${ticks}`.padStart(5),
        `${(tickMs / Math.max(ticks, 1)).toFixed(3)}ms`.padStart(9),
        `${tickMs.toFixed(0)}ms`.padStart(9),
        `${heapMb.toFixed(2)}MB`.padStart(9),
      ].join("  "),
    );
  }
}

function createDocument(nodeCount: number, density: Density): GraphDocument {
  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, index) => ({
    id: `note-${index}`,
    kind: "note",
    slug: `note-${index}`,
    title: `Note ${index}`,
    permalink: `/note-${index}`,
    path: `notes/note-${index}`,
    tags: index % 7 === 0 ? [`topic-${index % 5}`] : [],
    date: null,
  }));
  const targetCount = Math.round(nodeCount * (density === "high" ? 4 : 1.2));
  const links: GraphLink[] = [];
  const seen = new Set<string>();
  let seed = 1234567;
  for (let index = 0; index < targetCount; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const source = index % nodeCount;
    const target = seed % nodeCount;
    if (source === target) continue;
    const key = source < target ? `${source}:${target}` : `${target}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source: `note-${source}`, target: `note-${target}` });
  }
  return {
    nodes,
    links,
    centerId: nodes[0]?.id ?? null,
  };
}
