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
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs, getBreadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import {
  createPostDiffApi,
  getPostDiff,
  PostDiffView,
} from "@riebeckite/plugin-diff";
import {
  type DocsNavigationItem,
  type DocsOptions,
  DocsPrevNext,
  type DocsPrevNextProps,
  DocsSidebar,
  flattenDocsNavigation,
  getDocsNavigation,
  getDocsPrevNext,
} from "@riebeckite/plugin-docs";
import { getLocalization, LanguageSwitcher } from "@riebeckite/plugin-l10n";
import { getLocalGraph, LocalGraph } from "@riebeckite/plugin-local-graph";
import {
  getProperties,
  Properties,
  type PropertiesOptions,
} from "@riebeckite/plugin-properties";
import {
  getRelatedPosts,
  RelatedPosts,
  type RelatedPostsOptions,
  resolveRelatedPostsOptions,
} from "@riebeckite/plugin-related-posts";
import {
  getShareLinks,
  ShareControls,
  type ShareOptions,
} from "@riebeckite/plugin-share";
import {
  extractTableOfContents,
  TableOfContents,
} from "@riebeckite/plugin-toc";
import {
  getWebmentionSectionData,
  WebmentionSection,
} from "@riebeckite/plugin-webmention";
import { createRoute } from "honox/factory";
import { webmentionProvider } from "../../../../webmention";
import Article from "../components/article/article";
import HomePage from "../components/home/home";
import { getArticleTitle } from "../lib/article-title";
import { resolveWebLocale } from "../lib/locale";
import { buildArticleSeo, buildHomeSeo, buildWebsiteSeo } from "../lib/seo";

function pluginOptions<T>(name: string): T | undefined {
  const plugin = config.plugins.find(
    (candidate) =>
      candidate.name === name || candidate.name.startsWith(`${name}:`),
  );
  return plugin?.options as T | undefined;
}

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

    const tableOfContents = extractTableOfContents(resolved.post.html ?? "");
    c.set(
      "seo",
      buildArticleSeo(
        resolved.entry.permalink,
        resolved.post,
        resolved.entry.headTags,
        getEntryLanguage(resolved.entry),
      ),
    );

    const breadcrumbItems = await getBreadcrumbs({
      view,
      entry,
      homeLabel: config.site.title,
    });
    const propertiesData = await getProperties({
      view,
      frontmatter: resolved.post.frontmatter,
      options: pluginOptions<PropertiesOptions>("properties"),
    });
    const backlinks = await getBacklinks({ view, slug });
    const relatedPostsOptions = resolveRelatedPostsOptions(
      pluginOptions<RelatedPostsOptions>("related-posts") ?? {},
    );
    const relatedPosts = await getRelatedPosts({
      view,
      entry,
      options: relatedPostsOptions,
    });
    const shareLinks = await getShareLinks({
      entry,
      site: config,
      options: pluginOptions<ShareOptions>("share"),
    });
    const localGraph = await getLocalGraph({ view, slug });
    const webmentions = await getWebmentionSectionData({
      view,
      slug,
      config,
      provider: webmentionProvider,
    });

    const docsOptions = pluginOptions<DocsOptions>("docs");
    let docsNavigation: readonly DocsNavigationItem[] = [];
    let docsPrevNext: DocsPrevNextProps = {};
    if (docsOptions) {
      const navigation = await getDocsNavigation({
        view,
        entrySlug: slug,
        options: docsOptions,
      });
      if (
        flattenDocsNavigation(navigation).some((item) => item.slug === slug)
      ) {
        docsNavigation = navigation;
        docsPrevNext = await getDocsPrevNext({ items: navigation, slug });
      }
    }

    const postDiff = await getPostDiff({
      api: createPostDiffApi({ cwd: config.content.directory }),
      filePath: manifest.contentIndex.get(slug.toLowerCase()) ?? `${slug}.md`,
    });

    return c.render(
      <Article
        content={resolved.post}
        title={getArticleTitle(slug, resolved.post.frontmatter.title)}
        headerContent={
          <>
            <Breadcrumbs items={breadcrumbItems} />
            <LanguageSwitcher localization={getLocalization(view, slug)} />
          </>
        }
        metadataContent={<Properties data={propertiesData} />}
        asideContent={
          <TableOfContents
            className="rr-table-of-contents--desktop"
            items={tableOfContents}
          />
        }
        articleAside={
          docsNavigation.length > 0 ? (
            <div class="rb-article-aside">
              <DocsSidebar
                items={docsNavigation}
                currentPermalink={entry.permalink}
                label={docsOptions?.sidebar?.label}
              />
            </div>
          ) : null
        }
        footerContent={
          <>
            <DocsPrevNext
              previous={docsPrevNext.previous}
              next={docsPrevNext.next}
              language={getEntryLanguage(resolved.entry)}
            />
            <Backlinks backlinks={backlinks} />
            <RelatedPosts
              entries={relatedPosts}
              options={relatedPostsOptions}
            />
            <ShareControls {...shareLinks} />
            {localGraph ? <LocalGraph graph={localGraph} /> : null}
            <PostDiffView diff={postDiff} />
            <WebmentionSection {...webmentions} />
          </>
        }
      />,
    );
  }),
);
