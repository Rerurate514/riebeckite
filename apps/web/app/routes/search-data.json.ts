import { buildSearchItems, type SearchItem } from "@riebeckite/plugin-search";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

let cachedSearchItems: SearchItem[] | null = null;

export default createRoute(async (c) => {
  const items = await getSearchItems();

  return c.json(items, 200, {
    "Cache-Control": "public, max-age=300",
  });
});

async function getSearchItems(): Promise<SearchItem[]> {
  if (cachedSearchItems) return cachedSearchItems;

  cachedSearchItems = buildSearchItems({
    manifest: await content.getManifest(),
    config,
    resolveTitle: getArticleTitle,
  });

  return cachedSearchItems;
}
