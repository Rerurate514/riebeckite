import { content } from "virtual:riebeckite/content";
import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { createRoute } from "honox/factory";
import HomePage from "../components/home/home";
import { renderHomeRuntime } from "../lib/home-runtime";
import { buildHomeSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    c.set(
      "seo",
      buildWebsiteSeo(
        {
          title: home.page.title ?? "",
          description: home.page.description ?? "",
          path: home.page.pathname,
        },
        home.page.headTags,
      ),
    );
    return c.render(<PageBody html={home.page.body} />);
  }

  c.set("seo", buildHomeSeo("en", home.entry.headTags));

  return c.render(<HomePage locale="en" runtime={await renderHomeRuntime()} />);
});
