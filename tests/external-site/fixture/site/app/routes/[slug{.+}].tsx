import { isPublished } from "@riebeckite/core";
import { resolveContentRoute } from "@riebeckite/honox/server";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";

export default createRoute(
  ssgParams(async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\/+/, "") }));
  }),
  async (c) => {
    const requestedSlug = c.req.param("slug");
    if (!requestedSlug) return c.notFound();

    if (/\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const manifest = await content.getManifest();
    const route = resolveContentRoute(manifest, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect") return c.redirect(route.location, route.status);

    const post = await content.getProcessedContent(route.entry.slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

    return c.render(
      <main>
        <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
      </main>
    );
  }
);
