import type { PluginSiteComponent } from "@riebeckite/core";
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

  const showExplorerLink =
    site?.config.plugins.some((plugin) => plugin.name === "garden-explorer") ??
    false;

  return (
    <>
      <LocalGraphView graph={graph} showExplorerLink={showExplorerLink} />
      <script
        id="riebeckite-local-graph-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: escapeScriptJson(JSON.stringify(graph)),
        }}
      />
    </>
  );
}) satisfies PluginSiteComponent<LocalGraphProps>;

export default LocalGraph;
