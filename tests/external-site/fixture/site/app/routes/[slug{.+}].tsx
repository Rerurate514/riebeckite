import { isPublished } from "@riebeckite/core";
import {
  pluginPageSsgParams,
  resolveRiebeckiteRoute,
} from "@riebeckite/honox/server";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { FixtureArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(
  ssgParams(async () => {
    const manifest = await content.getManifest();
    const contentPaths = manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
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
      c.set("headTags", []);
      return c.render(
        <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
      );
    }

    const manifest = await content.getManifest();

    const post = await content.getProcessedContent(route.entry.slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <FixtureArticle
        post={post}
        propertiesHtml={route.entry.bodySlots?.properties}
      />,
    );
  },
);
