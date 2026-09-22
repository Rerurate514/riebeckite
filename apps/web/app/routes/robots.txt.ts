import { createRoute } from "honox/factory";
import { buildAbsoluteUrl } from "../lib/seo";

export default createRoute((c) => {
  const body = [
    `User-agent: *`,
    `Allow: /`,
    `Sitemap: ${buildAbsoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
  return c.text(body, 200, { "content-type": "text/plain; charset=utf-8" });
});
