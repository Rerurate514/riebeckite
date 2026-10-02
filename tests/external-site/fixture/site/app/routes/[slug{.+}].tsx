import {
  resolveRiebeckiteRoute,
  riebeckiteSsgParams,
} from "@riebeckite/honox/server";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { FixtureArticle } from "../components/article";
import { content } from "../content";

export default createRoute(
  ssgParams(() => riebeckiteSsgParams(content)),
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

    const post = await content.getProcessedContent(route.entry.slug);
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <FixtureArticle
        post={post}
        propertiesHtml={route.entry.bodySlots?.properties}
      />,
    );
  },
);
