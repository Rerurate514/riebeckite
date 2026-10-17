import { createPublicContentView } from "@riebeckite/core";
import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { SiteProvider } from "@riebeckite/ui";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);
  if (home.kind === "response") return home.response;
  if (home.kind === "page") return c.render(<PageBody html={home.page.body} />);
  const manifest = await content.getManifest();
  const view = createPublicContentView(manifest);
  const entry = view.findRoutableBySlug(home.entry.slug);
  if (!entry) return c.notFound();
  return c.render(<SiteProvider config={config} manifest={manifest} view={view} path={c.req.path}><SiteArticle post={home.post} entry={entry} /></SiteProvider>);
});
