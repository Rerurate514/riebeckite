import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
} from "@riebeckite/honox/server";
import { PageBody, SiteProvider } from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "virtual:riebeckite/content";
import { config } from "virtual:riebeckite/config";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  async (c) => {
    const resolved = await resolveRiebeckiteContentRequest(c, content);

    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      return c.render(<PageBody html={resolved.page.body} />);
    }

    const manifest = await content.getManifest();
    const view = createPublicContentView(manifest);
    const entry = view.findRoutableBySlug(resolved.entry.slug);
    if (!entry) return c.notFound();
    return c.render(<SiteProvider config={config} manifest={manifest} view={view} path={c.req.path}><SiteArticle post={resolved.post} entry={entry} /></SiteProvider>);
  },
);
