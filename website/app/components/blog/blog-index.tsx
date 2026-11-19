import {
  buildTaxonomyTagHref,
  resolveTaxonomyOptionsFromConfig,
} from "@riebeckite/plugin-taxonomy";
import { useSiteContext } from "@riebeckite/ui";
import { formatBlogDate, getBlogPosts } from "../../lib/blog";
import type { WebLocale } from "../../lib/locale";

const copy = {
  en: {
    title: "Blog",
    description:
      "Release notes, engineering deep dives, comparisons with other static site generators, and practical guides for publishing Markdown and Obsidian notes with Riebeckite.",
    language: { href: "/ja/blog/", lang: "ja", label: "日本語" },
    listLabel: "Blog posts",
    empty:
      "No posts yet. Release notes, tutorials, and engineering notes will appear here.",
  },
  ja: {
    title: "ブログ",
    description:
      "Markdown と Obsidian のノートを Web サイトとして公開するための、リリース情報・技術記事・他ツールとの比較・実践ガイド。",
    language: { href: "/blog/", lang: "en", label: "English" },
    listLabel: "記事一覧",
    empty:
      "まだ記事はありません。リリース情報やチュートリアル、技術ノートを順次公開していきます。",
  },
} satisfies Record<
  WebLocale,
  {
    title: string;
    description: string;
    language: { href: string; lang: string; label: string };
    listLabel: string;
    empty: string;
  }
>;

export function BlogIndex({ locale }: { locale: WebLocale }) {
  const site = useSiteContext();
  const t = copy[locale];
  const posts = site ? getBlogPosts(locale, site.view, site.manifest) : [];
  const taxonomy = site ? resolveTaxonomyOptionsFromConfig(site.config) : null;

  return (
    <div class="rb-blog-index">
      <header class="rb-blog-index__header">
        <h1>{t.title}</h1>
        <p class="rb-blog-index__description">{t.description}</p>
        <a
          class="rb-blog-index__language"
          href={t.language.href}
          hreflang={t.language.lang}
          lang={t.language.lang}
        >
          {t.language.label}
        </a>
      </header>
      {posts.length === 0 ? (
        <p class="rb-blog-index__empty">{t.empty}</p>
      ) : (
        <ol class="rb-blog-index__list" aria-label={t.listLabel}>
          {posts.map((post) => {
            const displayDate = formatBlogDate(post.date, locale);
            return (
              <li class="rb-blog-index__post" key={post.slug}>
                {displayDate && post.date ? (
                  <time class="rb-blog-index__date" dateTime={post.date}>
                    {displayDate}
                  </time>
                ) : null}
                <h2 class="rb-blog-index__post-title">
                  <a href={post.href}>{post.title}</a>
                </h2>
                {post.description ? (
                  <p class="rb-blog-index__summary">{post.description}</p>
                ) : null}
                {post.category || post.tags.length > 0 ? (
                  <p class="rb-blog-index__meta">
                    {post.category ? (
                      <span class="rb-blog-index__category">
                        {post.category}
                      </span>
                    ) : null}
                    {post.tags.map((tag) => (
                      <a
                        class="rb-blog-index__tag"
                        key={tag}
                        href={buildTaxonomyTagHref(
                          tag,
                          taxonomy?.tagsBasePath ?? "/tags",
                        )}
                      >
                        #{tag}
                      </a>
                    ))}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
