import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleFooter,
  ArticleHeader,
} from "@riebeckite/honox/ui";
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { RelatedPosts } from "@riebeckite/plugin-related-posts";
import { ShareControls } from "@riebeckite/plugin-share";
import { SeriesNavigation } from "@riebeckite/plugin-series";
import { buildTaxonomyTagHref } from "@riebeckite/plugin-taxonomy";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { formatPostDate } from "../lib/date";
import { PoweredByRiebeckite } from "./powered-by-riebeckite";

export function SiteArticle() {
  const article = useArticleContext();
  const site = useSiteContext();
  const entry = article?.entry;
  const title = entry?.title ?? article?.post.frontmatter.title ?? "";
  const date = formatPostDate(entry?.date, site?.language);

  return (
    <Article class="site-article">
      <ArticleHeader class="site-article__header">
        <h1 class="site-article__title">{title}</h1>
        {date ? (
          <p class="site-article__date">
            <time dateTime={entry?.date ?? undefined}>{date}</time>
          </p>
        ) : null}
      </ArticleHeader>
      <div class="site-article__layout">
        <ArticleContent>
          {entry && entry.tags.length > 0 ? (
            <ul class="site-article__tags" aria-label="Tags">
              {entry.tags.map((tag) => (
                <li class="site-article__tag" key={tag}>
                  <a href={buildTaxonomyTagHref(tag, "/tags")}>#{tag}</a>
                </li>
              ))}
            </ul>
          ) : null}
          <SeriesNavigation />
          <ArticleBody />
          <PoweredByRiebeckite />
          <ArticleFooter class="site-article__footer">
            <div class="site-article__actions">
              <ShareControls />
            </div>
            <RelatedPosts />
          </ArticleFooter>
        </ArticleContent>
        <aside class="site-article__aside">
          <AuthorCard />
          <div class="site-article__card site-article__toc">
            <TableOfContents placement="desktop-rail" />
          </div>
          <div class="site-article__card site-article__backlinks">
            <Backlinks />
          </div>
        </aside>
      </div>
    </Article>
  );
}

function AuthorCard() {
  const site = useSiteContext();
  if (!site) return null;
  const name = site.config.site.author || site.config.site.title;

  return (
    <section class="site-article__card site-article__author" aria-label="About this blog">
      <div class="site-article__author-head">
        <img
          src="/riebeckite-logo.png"
          alt=""
          class="site-article__author-avatar"
          width="44"
          height="44"
        />
        <p class="site-article__author-name">{name}</p>
      </div>
      <p class="site-article__author-links">
        <a href="/tags">Tags</a>
        <span aria-hidden="true">/</span>
        <a href="/series">Series</a>
        <span aria-hidden="true">/</span>
        <a href="/feed.xml">RSS</a>
      </p>
    </section>
  );
}
