import { renderSitemap } from "@riebeckite/plugin-seo";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();

  return c.text(renderSitemap(config, manifest.entries), 200, {
    "content-type": "application/xml; charset=utf-8",
  });
});
