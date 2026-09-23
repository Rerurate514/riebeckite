import { createRoute } from "honox/factory";
import { config } from "../config";
import { renderRobots } from "../lib/seo";

export default createRoute((c) => {
  return c.text(renderRobots(config), 200, {
    "content-type": "text/plain; charset=utf-8",
  });
});
