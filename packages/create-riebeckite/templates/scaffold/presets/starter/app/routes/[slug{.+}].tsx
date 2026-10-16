import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs, getBreadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { Properties, getProperties } from "@riebeckite/plugin-properties";
import { getRelatedPosts, RelatedPosts, resolveRelatedPostsOptions } from "@riebeckite/plugin-related-posts";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  async (c) => {
    const resolved = await resolveRiebeckiteContentRequest(c, content);

    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      return c.render(<PageBody html={resolved.page.body} />);
    }

    const tableOfContents = extractTableOfContents(resolved.post.html ?? "");
    const manifest = await content.getManifest();
    const view = createPublicContentView(manifest);
    const entry = view.findRoutableBySlug(resolved.entry.slug);
    if (!entry) return c.notFound();
    const relatedOptions = resolveRelatedPostsOptions({});

    return c.render(
      <SiteArticle
        post={resolved.post}
        header={<Breadcrumbs items={getBreadcrumbs({ view, entry, homeLabel: config.site.title })} />}
        metadata={<Properties data={getProperties({ view, frontmatter: resolved.post.frontmatter, options: { include: ["created", "modified", "tags", "status"], order: ["created", "modified", "tags", "status"] } })} />}
        aside={<TableOfContents className="rr-table-of-contents--desktop" items={tableOfContents} />}
        footer={<><Backlinks backlinks={getBacklinks({ view, slug: entry.slug })} /><RelatedPosts entries={getRelatedPosts({ view, entry, options: relatedOptions })} options={relatedOptions} /></>}
      />,
    );
  },
);
