/** @jsxImportSource hono/jsx */
import { buildGraphEdges, layoutRadialGraph } from "../src/graph";

export type LocalGraphNode = {
  slug: string;
  title: string;
  relation: "current" | "outgoing" | "backlink" | "both";
  outgoing: string[];
  backlinks: string[];
};

export type LocalGraphData = {
  currentSlug: string;
  nodes: LocalGraphNode[];
};

type Props = {
  graph: LocalGraphData;
};

const GRAPH_WIDTH = 640;
const GRAPH_HEIGHT = 320;

export default function LocalGraph(props: Props) {
  if (props.graph.nodes.length <= 1) return null;

  const edges = buildGraphEdges(props.graph.nodes);
  const layout = layoutRadialGraph(props.graph.nodes, {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    centerSlug: props.graph.currentSlug,
    radiusRatio: 0.34,
    minNodeRadius: 7,
    maxNodeRadius: 12,
  });

  return (
    <section
      class="local-graph rr-local-graph max-w-4xl mx-auto px-4"
      aria-labelledby="local-graph-title"
    >
      <div class="local-graph__header">
        <div>
          <p class="local-graph__eyebrow">Local Graph</p>
          <h2 id="local-graph-title">Nearby Notes</h2>
        </div>
        <a
          class="local-graph__explorer-link"
          href={`/explore?note=${encodeURIComponent(props.graph.currentSlug)}`}
        >
          Open in Explorer →
        </a>
      </div>

      <svg
        class="local-graph__canvas"
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        role="img"
        aria-label="Local graph of outgoing links and backlinks"
      >
        {edges.map((edge) => {
          const source = layout.get(edge.source);
          const target = layout.get(edge.target);
          if (!source || !target) return null;

          return (
            <line
              class="local-graph__edge"
              data-direction={
                edge.source === props.graph.currentSlug
                  ? "outgoing"
                  : "backlink"
              }
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              key={`${edge.source}-${edge.target}`}
            />
          );
        })}
        {props.graph.nodes.map((node) => {
          const point = layout.get(node.slug);
          if (!point) return null;
          const isCurrent = node.slug === props.graph.currentSlug;

          return (
            <g
              class="local-graph__node"
              data-relation={node.relation}
              key={node.slug}
            >
              <a
                href={`/${encodeURI(node.slug)}`}
                aria-label={
                  isCurrent
                    ? `Current note: ${node.title}`
                    : `Open ${node.title}`
                }
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isCurrent ? 16 : point.radius}
                />
                <text
                  x={point.x + (isCurrent ? 20 : 16)}
                  y={point.y + 5}
                  text-anchor={point.x > GRAPH_WIDTH * 0.78 ? "end" : "start"}
                  dx={point.x > GRAPH_WIDTH * 0.78 ? -32 : 0}
                >
                  {node.title}
                </text>
              </a>
            </g>
          );
        })}
      </svg>

      <div class="local-graph__legend">
        <span>
          <i data-kind="current" />
          Current
        </span>
        <span>
          <i data-kind="outgoing" />
          Outgoing
        </span>
        <span>
          <i data-kind="backlink" />
          Backlink
        </span>
      </div>
    </section>
  );
}
