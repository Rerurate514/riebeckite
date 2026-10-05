import { getEntryLanguage } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  pluginPageSsgParams,
  resolveRiebeckiteRoute,
} from "@riebeckite/honox/server";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "../content";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", async () => {
    const manifest = await content.getManifest();
    const contentPaths = manifest.publicEntries
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\/+/, "") }));
    return [...contentPaths, ...(await pluginPageSsgParams(content))];
  }),
  async (c) => {
    const requestedSlug = c.req.param("slug");
    if (!requestedSlug) return c.notFound();
    if (/\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const route = await resolveRiebeckiteRoute(content, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);
    if (route.kind === "page") {
      c.set("headTags", route.page.headTags ?? []);
      c.set("htmlLanguage", route.page.language);
      return c.render(
        <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
      );
    }

    const post = await content.getProcessedContent(route.entry.slug);

    c.set("htmlLanguage", getEntryLanguage(route.entry));
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <SiteArticle
        post={post}
        bodySlots={route.entry.bodySlots}
      />,
    );
  },
);