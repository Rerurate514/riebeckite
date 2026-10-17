import type { PluginComponent } from "@riebeckite/core";
import { buildGraphEdges, layoutRadialGraph } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import type { LocalGraphData } from "../src/local-graph.js";
import { getLocalGraph } from "../src/local-graph.server.js";

export type LocalGraphProps = {
  graph?: LocalGraphData | null;
};

const GRAPH_WIDTH = 640;
const GRAPH_HEIGHT = 320;

const LocalGraph = (async (props: Readonly<LocalGraphProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const graph =
    props.graph ??
    (site && article?.entry
      ? await getLocalGraph({ view: site.view, slug: article.entry.slug })
      : null);
  if (!graph || graph.nodes.length <= 1) return [];

  const edges = buildGraphEdges(graph.nodes);
  const layout = layoutRadialGraph(graph.nodes, {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    centerSlug: graph.currentSlug,
    radiusRatio: 0.34,
    minNodeRadius: 7,
    maxNodeRadius: 12,
  });

  return (
    <section class="rr-local-graph" aria-labelledby="local-graph-title">
      <div class="rr-local-graph__header">
        <div>
          <p class="rr-local-graph__eyebrow">Local Graph</p>
          <h2 id="local-graph-title">Nearby Notes</h2>
        </div>
        <a
          class="rr-local-graph__explorer-link"
          href={`/explore?note=${encodeURIComponent(graph.currentSlug)}`}
        >
          Open in Explorer →
        </a>
      </div>

      <svg
        class="rr-local-graph__canvas"
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
              class="rr-local-graph__edge"
              data-direction={
                edge.source === graph.currentSlug ? "outgoing" : "backlink"
              }
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              key={`${edge.source}-${edge.target}`}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const point = layout.get(node.slug);
          if (!point) return null;
          const isCurrent = node.slug === graph.currentSlug;

          return (
            <g
              class="rr-local-graph__node"
              data-relation={node.relation}
              key={node.slug}
            >
              <a
                href={node.permalink}
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

      <div class="rr-local-graph__legend">
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
}) satisfies PluginComponent<LocalGraphProps>;

export default LocalGraph;
