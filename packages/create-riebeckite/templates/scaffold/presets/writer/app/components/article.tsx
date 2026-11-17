import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleFooter,
  ArticleHeader,
} from "@riebeckite/honox/ui";
import { Breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { ShareControls } from "@riebeckite/plugin-share";
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
  const author = site?.config.site.author || site?.config.site.title;
  const posts = (site?.view.discoverableEntries ?? [])
    .filter((post) => post.permalink !== "/")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const currentIndex = posts.findIndex((post) => post.slug === entry?.slug);
  const previousPost = currentIndex >= 0 ? posts[currentIndex + 1] : undefined;
  const morePosts = posts
    .filter((post) => post.slug !== entry?.slug)
    .slice(0, 3)
    .flatMap((post) => {
      const postedAt = new Date(post.date ?? "");
      if (Number.isNaN(postedAt.getTime())) return [];
      return [
        {
          slug: post.slug,
          permalink: post.permalink,
          title: post.title,
          postedAt,
        },
      ];
    });

  return (
    <Article class="site-article">
      <ArticleHeader class="site-article__header">
        <Breadcrumbs className="site-article__breadcrumbs" />
        <h1 class="site-article__title">{title}</h1>
        <div class="site-article__byline">
          <img
            src="/riebeckite-logo.png"
            alt=""
            class="site-article__avatar"
            width="36"
            height="36"
          />
          <div class="site-article__byline-text">
            <p class="site-article__author">{author}</p>
            {date ? (
              <p class="site-article__date">
                <time dateTime={entry?.date ?? undefined}>{date}</time>
              </p>
            ) : null}
          </div>
        </div>
      </ArticleHeader>
      <ArticleContent>
        <TableOfContents />
        <ArticleBody />
        {entry && entry.tags.length > 0 ? (
          <ul class="site-article__tags" aria-label="Tags">
            {entry.tags.map((tag) => (
              <li class="site-article__tag" key={tag}>
                <a href={buildTaxonomyTagHref(tag, "/tags")}>#{tag}</a>
              </li>
            ))}
          </ul>
        ) : null}
        <ArticleFooter class="site-article__footer">
          <div class="site-article__actions">
            <ShareControls />
          </div>
          <AuthorCard />
          {previousPost ? (
            <a class="site-article__previous" href={previousPost.permalink}>
              <span class="site-article__previous-label">Previous post</span>
              <span class="site-article__previous-title">
                {previousPost.title}
              </span>
            </a>
          ) : null}
          <RecentPosts posts={morePosts} title="More from this writer" />
          <PoweredByRiebeckite />
        </ArticleFooter>
      </ArticleContent>
    </Article>
  );
}

function AuthorCard() {
  const site = useSiteContext();
  if (!site) return null;
  const name = site.config.site.author || site.config.site.title;

  return (
    <section class="site-article__author-card" aria-label="About the author">
      <div class="site-article__author-head">
        <img
          src="/riebeckite-logo.png"
          alt=""
          class="site-article__author-avatar"
          width="64"
          height="64"
        />
        <div class="site-article__author-body">
          <p class="site-article__author-name">{name}</p>
          {site.config.site.description ? (
            <p class="site-article__author-bio">
              {site.config.site.description}
            </p>
          ) : null}
        </div>
        <a class="site-article__about-link" href="/about">
          About
        </a>
      </div>
      <p class="site-article__author-links">
        <a href="/posts">Posts</a>
        <a href="/tags">Tags</a>
        <a href="/series">Series</a>
      </p>
    </section>
  );
}
