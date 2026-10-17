import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { createPublicContentView, getEntryLanguage } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import {
  createPostDiffApi,
  getPostDiff,
  PostDiffView,
} from "@riebeckite/plugin-diff";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { LanguageSwitcher } from "@riebeckite/plugin-l10n";
import { LocalGraph } from "@riebeckite/plugin-local-graph";
import { Properties } from "@riebeckite/plugin-properties";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { ShareControls } from "@riebeckite/plugin-share";
import { TableOfContents } from "@riebeckite/plugin-toc";
import {
  getWebmentionSectionData,
  WebmentionSection,
} from "@riebeckite/plugin-webmention";
import { SiteProvider } from "@riebeckite/ui";
import { createRoute } from "honox/factory";
import { webmentionProvider } from "../../../../webmention";
import Article from "../components/article/article";
import HomePage from "../components/home/home";
import { getArticleTitle } from "../lib/article-title";
import { resolveWebLocale } from "../lib/locale";
import { buildArticleSeo, buildHomeSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  ssgEnumerableHandler(async (c, next) => {
    // Archive has a dedicated route; defer to it.
    if (c.req.path.startsWith("/archive/")) {
      return next();
    }

    const resolved = await resolveRiebeckiteContentRequest(c, content);
    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      c.set(
        "seo",
        buildWebsiteSeo(
          {
            title: resolved.page.title ?? "",
            description: resolved.page.description ?? "",
            path: resolved.page.pathname,
          },
          resolved.page.headTags,
        ),
      );
      return c.render(<PageBody html={resolved.page.body} />);
    }

    if (resolved.post.frontmatter.homepage === true) {
      const locale = resolveWebLocale(getEntryLanguage(resolved.entry));
      c.set("seo", buildHomeSeo(locale, resolved.entry.headTags));
      return c.render(<HomePage locale={locale} />);
    }

    const slug = resolved.entry.slug;
    const manifest = await content.getManifest();
    const view = createPublicContentView(manifest);
    const entry = view.findRoutableBySlug(slug);
    if (!entry) return c.notFound();

    c.set(
      "seo",
      buildArticleSeo(
        resolved.entry.permalink,
        resolved.post,
        resolved.entry.headTags,
        getEntryLanguage(resolved.entry),
      ),
    );

    const webmentions = await getWebmentionSectionData({
      view,
      slug,
      config,
      provider: webmentionProvider,
    });

    const postDiff = await getPostDiff({
      api: createPostDiffApi({ cwd: config.content.directory }),
      filePath: manifest.contentIndex.get(slug.toLowerCase()) ?? `${slug}.md`,
    });

    return c.render(
      <SiteProvider
        config={config}
        manifest={manifest}
        view={view}
        path={c.req.path}
      >
        <Article
          content={resolved.post}
          entry={entry}
          title={getArticleTitle(slug, resolved.post.frontmatter.title)}
          headerContent={
            <>
              <Breadcrumbs />
              <LanguageSwitcher />
            </>
          }
          metadataContent={<Properties />}
          asideContent={
            <TableOfContents className="rr-table-of-contents--desktop" />
          }
          articleAside={
            <div class="rb-article-aside">
              <DocsSidebar />
            </div>
          }
          footerContent={
            <>
              <DocsPrevNext />
              <Backlinks />
              <RelatedPosts />
              <ShareControls />
              <LocalGraph />
              <PostDiffView diff={postDiff} />
              <WebmentionSection {...webmentions} />
            </>
          }
        />
      </SiteProvider>,
    );
  }),
);
