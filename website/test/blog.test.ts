import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest, PublicContentView } from "@riebeckite/core";
import {
  formatBlogDate,
  getBlogIndexHeadTags,
  getBlogPath,
  getBlogPosts,
  isBlogPath,
} from "../app/lib/blog";

function viewOf(entries: unknown[]): PublicContentView {
  return { discoverableEntries: entries } as unknown as PublicContentView;
}

function manifestOf(entries: unknown[]): ContentManifest {
  return { entries } as unknown as ContentManifest;
}

function post(
  slug: string,
  permalink: string,
  title: string,
  date: string | undefined,
  frontmatter: Record<string, unknown> = {},
) {
  return {
    slug,
    permalink,
    title,
    date,
    tags: (frontmatter.tags as string[] | undefined) ?? [],
    publishing: { visibility: "public", routable: true, discoverable: true },
  };
}

test("getBlogPosts lists English posts newest first", () => {
  const view = viewOf([
    post("blog/b", "/blog/b", "Second post", "2026-11-19", {
      description: "B description",
      category: "Updates",
      tags: ["announcements"],
    }),
    post("blog/a", "/blog/a", "First post", "2026-11-20", {
      description: "A description",
    }),
    post("blog/c", "/blog/c", "Third post", "2026-11-18"),
    post("blog/a.ja", "/ja/blog/a", "First post", "2026-11-20"),
    post("docs/quick-start", "/docs/quick-start", "Quick start", "2026-10-01"),
  ]);
  const manifest = manifestOf([
    { slug: "blog/a", frontmatter: { description: "A description", tags: [] } },
    {
      slug: "blog/b",
      frontmatter: {
        description: "B description",
        category: "Updates",
        tags: ["announcements"],
      },
    },
  ]);

  const posts = getBlogPosts("en", view, manifest);

  assert.deepEqual(
    posts.map((p) => p.slug),
    ["blog/a", "blog/b", "blog/c"],
  );
  assert.equal(posts[0].title, "First post");
  assert.equal(posts[0].description, "A description");
  assert.equal(posts[0].href, "/blog/a");
  assert.deepEqual(posts[1].tags, ["announcements"]);
  assert.equal(posts[1].category, "Updates");
  assert.equal(posts[2].description, undefined);
});

test("getBlogPosts lists Japanese posts from the localized prefix", () => {
  const view = viewOf([
    post("blog/a", "/blog/a", "First post", "2026-11-20"),
    post("blog/a.ja", "/ja/blog/a", "最初の投稿", "2026-11-20"),
    post("blog/c", "/blog/c", "Third post", "2026-11-18"),
  ]);
  const manifest = manifestOf([{ slug: "blog/a.ja", frontmatter: {} }]);

  const posts = getBlogPosts("ja", view, manifest);

  assert.deepEqual(
    posts.map((p) => p.slug),
    ["blog/a.ja"],
  );
  assert.equal(posts[0].title, "最初の投稿");
});

test("getBlogPosts ignores sibling permalinks that only share the prefix spelling", () => {
  const view = viewOf([
    post("blog/a", "/blog/a", "First post", "2026-11-20"),
    post("blogging/x", "/blogging/x", "Not a blog post", "2026-11-21"),
    post("blog/index", "/blog", "Blog root entry", "2026-11-21"),
  ]);
  const manifest = manifestOf([]);

  const posts = getBlogPosts("en", view, manifest);

  assert.deepEqual(
    posts.map((p) => p.slug),
    ["blog/a"],
  );
});

test("getBlogPosts sorts posts without dates after dated posts", () => {
  const view = viewOf([
    post("blog/older", "/blog/older", "Older", "2026-11-01"),
    post("blog/newer", "/blog/newer", "Newer", undefined),
    post("blog/newest", "/blog/newest", "Newest", "2026-11-20"),
  ]);

  const posts = getBlogPosts("en", view, manifestOf([]));

  assert.deepEqual(
    posts.map((p) => p.slug),
    ["blog/newest", "blog/older", "blog/newer"],
  );
});

test("getBlogPosts with no posts returns an empty list", () => {
  const posts = getBlogPosts("en", viewOf([]), manifestOf([]));
  assert.deepEqual(posts, []);
});

test("getBlogPosts enriches summaries with category and trims blank descriptions", () => {
  const view = viewOf([post("blog/a", "/blog/a", "First post", "2026-11-20")]);
  const manifest = manifestOf([
    {
      slug: "blog/a",
      frontmatter: {
        category: "Engineering",
        description: "  ",
      },
    },
  ]);

  const [summary] = getBlogPosts("en", view, manifest);

  assert.equal(summary.category, "Engineering");
  assert.equal(summary.description, undefined);
});

test("getBlogPath returns route-localized blog paths without a trailing slash", () => {
  assert.equal(getBlogPath("en"), "/blog");
  assert.equal(getBlogPath("ja"), "/ja/blog");
});

test("isBlogPath matches English and Japanese article paths only", () => {
  assert.equal(isBlogPath("/blog/how-this-blog-is-built"), true);
  assert.equal(isBlogPath("/blog/how-this-blog-is-built/"), true);
  assert.equal(isBlogPath("/ja/blog/introducing-riebeckite-blog"), true);
  assert.equal(isBlogPath("/ja/blog/introducing-riebeckite-blog/"), true);
  assert.equal(isBlogPath("/blog"), true);
  assert.equal(isBlogPath("/ja/blog"), true);
  assert.equal(isBlogPath("/docs/blog-like"), false);
  assert.equal(isBlogPath("/blogging/tools"), false);
  assert.equal(isBlogPath("/ja/docs/quick-start"), false);
  assert.equal(isBlogPath("/"), false);
});

test("formatBlogDate localizes dates per locale", () => {
  const en = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
    new Date("2026-11-20"),
  );
  const ja = new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(
    new Date("2026-11-20"),
  );
  assert.equal(formatBlogDate("2026-11-20", "en"), en);
  assert.equal(formatBlogDate("2026-11-20", "ja"), ja);
  assert.match(formatBlogDate("2026-11-20", "en") ?? "", /2026/);
  assert.equal(formatBlogDate(undefined, "en"), undefined);
});

test("getBlogIndexHeadTags declares hreflang alternates for both locales", () => {
  assert.deepEqual(getBlogIndexHeadTags("en"), [
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "en", href: "/blog" },
    },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "ja", href: "/ja/blog" },
    },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "x-default", href: "/blog" },
    },
  ]);
  assert.deepEqual(getBlogIndexHeadTags("ja"), [
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "ja", href: "/ja/blog" },
    },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "en", href: "/blog" },
    },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "x-default", href: "/blog" },
    },
  ]);
});
