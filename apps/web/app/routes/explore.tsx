import { getGardenExplorerData } from "@riebeckite/plugin-garden-explorer";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";
import GardenExplorer from "../islands/garden-explorer";
import { getArticleTitle } from "../lib/article-title";
import { buildWebsiteSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const data = getGardenExplorerData({
    manifest: await content.getManifest(),
    config,
    resolveTitle: getArticleTitle,
  });
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Garden Explorer",
      description: "Explore notes through links, backlinks, tags, and folders.",
      path: "/explore",
    }),
  );

  return c.render(
    <main class="garden-explorer-page">
      <header class="garden-explorer-page__header">
        <p class="garden-explorer-page__eyebrow">{config.site.title}</p>
        <h1 class="garden-explorer-page__title">Garden Explorer</h1>
        <p class="garden-explorer-page__description">
          Graph, Search, Tags, Folders, Backlinks, and Related Notes を横断して
          Digital Garden を探索できます。
        </p>
      </header>
      <GardenExplorer data={data} />
    </main>,
  );
});
