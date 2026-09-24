import { createRoute } from "honox/factory";
import { config } from "../config";
import { getGardenExplorerData } from "../features/garden-explorer/garden-explorer.server";
import GardenExplorer from "../islands/garden-explorer";
import { buildWebsiteSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const data = await getGardenExplorerData();
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
