import type { PluginComponent } from "@riebeckite/core";
import { escapeScriptJson } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import type { LocalGraphData } from "../src/local-graph.js";
import { getLocalGraph } from "../src/local-graph.server.js";
import { LocalGraphView } from "./local-graph-view.js";

export type LocalGraphProps = {
  graph?: LocalGraphData | null;
};

export { LocalGraphView };

const LocalGraph = (async (props: Readonly<LocalGraphProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const graph =
    props.graph ??
    (site && article?.entry
      ? await getLocalGraph({ view: site.view, slug: article.entry.slug })
      : null);
  if (!graph) return html``;

  return (
    <>
      <LocalGraphView graph={graph} />
      <script
        id="riebeckite-local-graph-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: escapeScriptJson(JSON.stringify(graph)),
        }}
      />
    </>
  );
}) satisfies PluginComponent<LocalGraphProps>;

export default LocalGraph;
