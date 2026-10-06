import { getEntryLanguage } from "@riebeckite/core";
import { resolveRiebeckiteRoute } from "@riebeckite/honox/server";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import { content } from "../content";
import { buildIndexSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const configuredIndex = manifest.bySlug.get("index");
  if (configuredIndex && configuredIndex.permalink !== "/") {
    return c.redirect(configuredIndex.permalink, 308);
  }
  const route = await resolveRiebeckiteRoute(content, c.req.path);
  if (!route) return c.notFound();
  if (route.kind === "redirect")
    return c.redirect(route.location, route.status);
  if (route.kind === "page") {
    c.set(
      "seo",
      buildWebsiteSeo(
        {
          title: route.page.title ?? "",
          description: route.page.description ?? "",
          path: route.page.pathname,
        },
        route.page.headTags,
      ),
    );
    c.set("headTags", route.page.headTags ?? []);
    c.set("htmlLanguage", route.page.language);
    return c.render(
      <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
    );
  }

  const indexEntry = route.entry;
  const indexSlug = indexEntry.slug;
  const post = await content.getProcessedContent(indexSlug);
  const tableOfContents = extractTableOfContents(post.html ?? "");
  c.set("seo", buildIndexSeo(post, indexEntry.headTags));
  c.set("headTags", indexEntry.headTags ?? []);
  c.set("htmlLanguage", getEntryLanguage(indexEntry));

  return c.render(
    <Article
      content={post}
      title={post.frontmatter.title}
      bodySlots={indexEntry.bodySlots}
      asideContent={
        <TableOfContents
          className="table-of-contents--desktop"
          items={tableOfContents}
        />
      }
    />,
  );
});
