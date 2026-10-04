import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGraphEdges,
  layoutForceGraph,
  layoutRadialGraph,
} from "../packages/core/dist/index.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(
  scriptDirectory,
  "..",
  "apps",
  "web",
  ".riebeckite",
  "graph-render-benchmark",
);

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 620;
const DEFAULT_SIZES = [500, 1000, 2000];
const FORCE_SIZES = [200, 350, 499];

function createNodes(size) {
  const nodes = [];
  for (let index = 0; index < size; index++) {
    nodes.push({
      slug: `note-${String(index).padStart(5, "0")}`,
      outgoing: [],
      backlinks: [],
    });
  }
  const link = (source, target) => {
    if (source === target) return;
    nodes[source].outgoing.push(nodes[target].slug);
    nodes[target].backlinks.push(nodes[source].slug);
  };
  for (let index = 1; index < size; index++) {
    link(index, index - 1);
    if (index % 10 === 0) link(index, 0);
    if (index % 7 === 0) link(index, Math.floor(index / 2));
  }
  return nodes;
}

function measure(action) {
  const start = performance.now();
  const value = action();
  return { durationMs: performance.now() - start, value };
}

function benchmarkSize(size) {
  const nodes = createNodes(size);
  const visibleSlugs = new Set(nodes.map((node) => node.slug));
  const edges = measure(() => buildGraphEdges(nodes, visibleSlugs)).value;
  const radial = measure(() =>
    layoutRadialGraph(nodes, {
      width: GRAPH_WIDTH,
      height: GRAPH_HEIGHT,
      centerSlug: nodes[0].slug,
    }),
  );
  const force = FORCE_SIZES.includes(size)
    ? measure(() =>
        layoutForceGraph(nodes, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT }),
      ).durationMs
    : undefined;
  return {
    size,
    edgeCount: edges.length,
    layoutRadialMs: radial.durationMs,
    layoutForceMs: force,
    radial,
    edges,
  };
}

async function main() {
  const sizes = process.env.RIEBECKITE_GRAPH_BENCH_SIZES
    ? process.env.RIEBECKITE_GRAPH_BENCH_SIZES.split(",").map(Number)
    : [...DEFAULT_SIZES, ...FORCE_SIZES];
  const results = sizes
    .sort((left, right) => left - right)
    .map((size) => benchmarkSize(size));

  const nodeResults = results.map((result) => ({
    size: result.size,
    edgeCount: result.edgeCount,
    layoutRadialMs: round(result.layoutRadialMs),
    layoutForceMs:
      result.layoutForceMs === undefined ? null : round(result.layoutForceMs),
  }));
  console.log("Graph layout benchmark (Node, pure computation):");
  console.table(nodeResults);

  await fs.mkdir(outputDirectory, { recursive: true });
  const htmlPath = path.join(outputDirectory, "index.html");
  await fs.writeFile(htmlPath, createHtml(results), "utf8");
  console.log(`Browser harness: ${path.relative(process.cwd(), htmlPath)}`);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function createHtml(results) {
  const payload = results.map((result) => ({
    size: result.size,
    centerSlug: result.radial.value.keys().next().value,
    nodes: [...result.radial.value.entries()].map(([slug, point]) => ({
      slug,
      x: round(point.x),
      y: round(point.y),
      radius: round(point.radius),
    })),
    edges: result.edges.map((edge) => [edge.source, edge.target]),
  }));
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>graph-render-benchmark</title></head>
<body>
<h1>Garden Explorer graph render benchmark</h1>
<p>Mirrors the component DOM: one &lt;g transform&gt; with one &lt;line&gt; per edge and one &lt;circle&gt; per node.</p>
<pre id="results">running</pre>
<div id="stage"></div>
<script id="graph-data" type="application/json">${JSON.stringify(payload)}</script>
<script>
const svgNs = "http://www.w3.org/2000/svg";
const data = JSON.parse(document.getElementById("graph-data").textContent);
const stage = document.getElementById("stage");
const results = [];

function now() { return performance.now(); }
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function render(graph) {
  const container = document.createElement("div");
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("width", "900");
  svg.setAttribute("height", "620");
  svg.setAttribute("viewBox", "0 0 900 620");
  const group = document.createElementNS(svgNs, "g");

  const renderStart = now();
  for (const [source, target] of graph.edges) {
    const from = graph.bySlug.get(source);
    const to = graph.bySlug.get(target);
    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    group.appendChild(line);
  }
  const circles = [];
  for (const node of graph.nodes) {
    const circle = document.createElementNS(svgNs, "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.radius);
    group.appendChild(circle);
    circles.push(circle);
  }
  svg.appendChild(group);
  container.appendChild(svg);
  stage.appendChild(container);
  const renderMs = now() - renderStart;
  svg.getBoundingClientRect();

  const zoomSamples = [];
  for (let index = 0; index < 30; index++) {
    const start = now();
    const scale = 1 + (index % 10) / 20;
    group.setAttribute("transform", "translate(450,310) scale(" + scale + ") translate(-450,-310)");
    svg.getBoundingClientRect();
    zoomSamples.push(now() - start);
  }

  const panSamples = [];
  for (let index = 0; index < 30; index++) {
    const start = now();
    group.setAttribute("transform", "translate(" + (index % 20) + "," + (index % 10) + ")");
    svg.getBoundingClientRect();
    panSamples.push(now() - start);
  }

  const dragSamples = [];
  const dragged = circles[0];
  if (dragged) {
    for (let index = 0; index < 30; index++) {
      const start = now();
      dragged.setAttribute("cx", String(450 + index));
      dragged.setAttribute("cy", String(310 + (index % 5)));
      svg.getBoundingClientRect();
      dragSamples.push(now() - start);
    }
  }

  stage.removeChild(container);
  return {
    size: graph.nodes.length,
    edgeCount: graph.edges.length,
    initialRenderMs: renderMs,
    zoomMedianMs: median(zoomSamples),
    panMedianMs: median(panSamples),
    dragMedianMs: median(dragSamples),
  };
}

for (const graph of data) {
  graph.bySlug = new Map(graph.nodes.map((node) => [node.slug, node]));
  results.push(render(graph));
}

document.getElementById("results").textContent = JSON.stringify(results, null, 2);
document.title = "done-" + results.map((entry) => entry.size).join("-");
window.__graphBenchmarkResults = results;
</script>
</body>
</html>
`;
}

await main();
