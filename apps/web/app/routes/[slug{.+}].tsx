import { isPublished } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { config } from "../config";
import { content } from "../content";
import Backlinks from "../features/backlinks/backlinks";
import { getPublishedBacklinks } from "../features/backlinks/backlinks.server";
import TableOfContents, {
  extractTableOfContents,
} from "../features/table-of-contents/table-of-contents";
import { buildArticleSeo } from "../lib/seo";

export default createRoute(
  ssgParams(async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .map((entry) => ({ slug: entry.slug }));
  }),
  async (c, next) => {
    const slug = c.req.param("slug");
    if (c.req.path.startsWith("/tags/")) {
      return next();
    }

    if (!slug) return c.notFound();

    if (/\.[a-zA-Z0-9]+$/.test(slug)) return c.notFound();

    const post = await content.getProcessedContent(slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

    if (slug === "index") {
      return c.redirect("/", 301);
    }

    const backlinks = await getPublishedBacklinks(slug);
    const tableOfContents = extractTableOfContents(post.html ?? "");
    c.set("seo", buildArticleSeo(slug, post));

    return c.render(
      <Article
        content={post}
        asideContent={
          <TableOfContents
            className="table-of-contents--desktop"
            items={tableOfContents}
          />
        }
        footerContent={<Backlinks backlinks={backlinks} />}
      />,
    );
  },
);
