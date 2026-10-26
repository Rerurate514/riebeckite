import { content } from "virtual:riebeckite/content";
import { getEntryLanguage } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
  ssgEnumerableHandler,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { ArticlePostDiffView } from "@riebeckite/plugin-diff";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { LanguageSwitcher } from "@riebeckite/plugin-l10n";
import { LocalGraph } from "@riebeckite/plugin-local-graph";
import { Properties } from "@riebeckite/plugin-properties";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { SeriesNavigation } from "@riebeckite/plugin-series";
import { ShareControls } from "@riebeckite/plugin-share";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { ArticleWebmentionSection } from "@riebeckite/plugin-webmention";
import { createRoute } from "honox/factory";
import Article from "../components/article/article";
import HomePage from "../components/home/home";
import { getArticleTitle } from "../lib/article-title";
import { renderHomeRuntime } from "../lib/home-runtime";
import { resolveWebLocale } from "../lib/locale";
import { buildArticleSeo, buildHomeSeo, buildWebsiteSeo } from "../lib/seo";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  ssgEnumerableHandler(async (c, next) => {
    if (c.req.path === "/ja" || c.req.path === "/ja/") {
      c.set("htmlLanguage", "ja");
      c.set("seo", buildHomeSeo("ja"));
      return c.render(
        <HomePage locale="ja" runtime={await renderHomeRuntime()} />,
      );
    }

    const resolved = await resolveRiebeckiteContentRequest(c, content);
    if (resolved.kind === "response") {
      const response = await resolved.response;
      if (response.status === 404) return next();
      return response;
    }

    if (resolved.kind === "page") {
      if (resolved.page.language) {
        c.set("htmlLanguage", resolved.page.language);
      }
      c.set(
        "seo",
        buildWebsiteSeo(
          {
            title: resolved.page.title ?? "",
            description: resolved.page.description ?? "",
            path: resolved.page.pathname,
          },
          resolved.page.headTags,
          resolved.page.language,
        ),
      );
      return c.render(<PageBody html={resolved.page.body} />);
    }

    if (resolved.post.frontmatter.homepage === true) {
      const locale = resolveWebLocale(getEntryLanguage(resolved.entry));
      c.set("seo", buildHomeSeo(locale, resolved.entry.headTags));
      return c.render(
        <HomePage locale={locale} runtime={await renderHomeRuntime()} />,
      );
    }

    const slug = resolved.entry.slug;
    const entry = resolved.entry;

    c.set(
      "seo",
      buildArticleSeo(
        resolved.entry.permalink,
        resolved.post,
        resolved.entry.headTags,
        getEntryLanguage(resolved.entry),
      ),
    );

    return c.render(
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
        asideContent={<TableOfContents placement="desktop-rail" />}
        articleAside={<DocsSidebar placement="article-rail" />}
        footerContent={
          <>
            <DocsPrevNext />
            <SeriesNavigation />
            <Backlinks />
            <RelatedPosts />
            <ShareControls />
            <LocalGraph />
            <ArticlePostDiffView />
            <ArticleWebmentionSection />
          </>
        }
      />,
    );
  }),
);
