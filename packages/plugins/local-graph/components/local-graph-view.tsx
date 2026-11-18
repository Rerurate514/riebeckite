import { useUiLabels } from "@riebeckite/ui";
import { buildGraphDocument } from "@riebeckite/graph";
import GraphView from "@riebeckite/graph/ui";
import type { LocalGraphViewProps } from "../src/local-graph.js";

export function LocalGraphView(props: LocalGraphViewProps) {
  const { graph } = props;
  const labels = useUiLabels();
  const document =
    graph.document ??
    buildGraphDocument(
      graph.nodes.map((node) => ({
        slug: node.slug,
        title: node.title,
        permalink: node.permalink,
        date: null,
        links: [...new Set([...node.outgoing, ...node.backlinks])].map(
          (slug) => ({ raw: slug, slug, kind: "note" as const }),
        ),
      })),
      { centerSlug: graph.currentSlug },
    );
  return (
    <section class="rr-local-graph" data-riebeckite-local-graph>
      <div class="rr-local-graph__header">
        <div>
          <p class="rr-local-graph__eyebrow">{labels.localGraph}</p>
          <h2>{labels.nearbyNotes}</h2>
        </div>
        {props.showExplorerLink ? (
          <a
            class="rr-local-graph__explorer-link"
            href={`/explore?note=${encodeURIComponent(graph.currentSlug)}`}
          >
            {labels.openInExplorer} →
          </a>
        ) : null}
      </div>
      <GraphView
        document={document}
        mode="local"
        centerId={graph.currentSlug}
        initialSettings={{ depth: 1 }}
        maxDepth={3}
        storageKey="riebeckite-local-graph-settings"
        expandable
        showHeader={false}
        showModeLabel={false}
      />
      {graph.truncated ? (
        <p class="rr-local-graph__note">
          {labels.localGraphTruncated}
          {props.showExplorerLink
            ? ` ${labels.localGraphTruncatedExplorer}`
            : null}
        </p>
      ) : null}
    </section>
  );
}
