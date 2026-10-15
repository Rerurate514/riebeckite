import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs, getBreadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { Properties, getProperties } from "@riebeckite/plugin-properties";
import { getRelatedPosts, RelatedPosts, resolveRelatedPostsOptions } from "@riebeckite/plugin-related-posts";
import { DailyNotes, getDailyNotes } from "@riebeckite/plugin-daily-notes";
import { getRecentPosts, RecentPosts } from "@riebeckite/plugin-recent-posts";
import { getShareLinks, ShareControls } from "@riebeckite/plugin-share";
import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    return c.render(<PageBody html={home.page.body} />);
  }

  const manifest = await content.getManifest();
  const recentPosts = getRecentPosts({ manifest });
  const dailyNotes = getDailyNotes({ manifest, config });
  const tableOfContents = extractTableOfContents(home.post.html ?? "");
  const view = createPublicContentView(manifest);
  const entry = view.findRoutableBySlug(home.entry.slug);
  if (!entry) return c.notFound();
  const relatedOptions = resolveRelatedPostsOptions({});

  return c.render(
    <SiteArticle
      post={home.post}
      header={<Breadcrumbs items={getBreadcrumbs({ view, entry, homeLabel: config.site.title })} />}
      metadata={<Properties data={getProperties({ view, frontmatter: home.post.frontmatter, options: { include: ["created", "modified", "tags", "status"], order: ["created", "modified", "tags", "status"] } })} />}
      aside={<TableOfContents className="rr-table-of-contents--desktop" items={tableOfContents} />}
      afterContent={<><RecentPosts posts={recentPosts} /><DailyNotes notes={dailyNotes} /></>}
      footer={<><ShareControls {...getShareLinks({ entry, site: config })} /><Backlinks backlinks={getBacklinks({ view, slug: entry.slug })} /><RelatedPosts entries={getRelatedPosts({ view, entry, options: relatedOptions })} options={relatedOptions} /></>}
    />,
  );
});
