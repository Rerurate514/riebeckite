import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";
import { renderSitemap } from "../lib/seo";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();

  return c.text(renderSitemap(config, manifest.entries), 200, {
    "content-type": "application/xml; charset=utf-8",
  });
});
