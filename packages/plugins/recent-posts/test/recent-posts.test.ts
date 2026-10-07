import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOutputInventory,
  type ContentManifest,
  type ContentManifestEntry,
  determineOutputChanges,
  type OutputDependency,
  type OutputDescriptor,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { getRecentPosts, RecentPosts, recentPostsPlugin } from "../index.ts";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

test("getRecentPosts sorts newest first and applies the default limit of five", () => {
  const slugs = ["a", "b", "c", "d", "e", "f", "g"];
  const entries = slugs.map((slug, index) =>
    entry(slug, {
      frontmatter: {
        publish: true,
        date: `2024-01-${String(index + 1).padStart(2, "0")}`,
      },
    }),
  );

  const result = getRecentPosts({ manifest: manifest(entries, entries) });

  assert.equal(result.length, 5);
  assert.deepEqual(
    result.map((post) => post.slug),
    ["g", "f", "e", "d", "c"],
  );
  assert.equal(result[0]?.permalink, "/g");
});

test("getRecentPosts honors an explicit limit", () => {
  const entries = [
    entry("a", { frontmatter: { date: "2024-01-01" } }),
    entry("b", { frontmatter: { date: "2024-01-02" } }),
  ];

  const result = getRecentPosts({
    manifest: manifest(entries, entries),
    limit: 1,
  });
  assert.deepEqual(
    result.map((post) => post.slug),
    ["b"],
  );

  assert.deepEqual(
    getRecentPosts({ manifest: manifest(entries, entries), limit: 0 }),
    [],
  );
});

test("getRecentPosts skips the index slug", () => {
  const entries = [
    entry("index", { permalink: "/", frontmatter: { date: "2024-01-02" } }),
    entry("post", { frontmatter: { date: "2024-01-01" } }),
  ];

  const result = getRecentPosts({ manifest: manifest(entries, entries) });
  assert.deepEqual(
    result.map((post) => post.slug),
    ["post"],
  );
});

test("getRecentPosts drops entries with unusable dates", () => {
  const entries = [
    entry("bad", { frontmatter: { date: "not-a-date" } }),
    entry("undated", { frontmatter: { publish: true } }),
    entry("good", { frontmatter: { date: "2024-01-01" } }),
  ];

  const result = getRecentPosts({ manifest: manifest(entries, entries) });
  assert.deepEqual(
    result.map((post) => post.slug),
    ["good"],
  );
});

test("getRecentPosts falls back to created and preserves Date instances", () => {
  const explicit = new Date("2024-06-06T00:00:00.000Z");
  const entries = [
    entry("created", { frontmatter: { created: "2024-05-05" } }),
    entry("date-object", { frontmatter: { date: explicit } }),
  ];

  const result = getRecentPosts({ manifest: manifest(entries, entries) });
  assert.equal(result[0]?.slug, "date-object");
  assert.equal(result[0]?.postedAt, explicit);
  assert.equal(result[1]?.postedAt.toISOString(), "2024-05-05T00:00:00.000Z");
});

test("getRecentPosts uses the manifest entry title", () => {
  const entries = [
    entry("post", { title: "Hello", frontmatter: { date: "2024-01-01" } }),
  ];

  assert.deepEqual(getRecentPosts({ manifest: manifest(entries, entries) }), [
    {
      slug: "post",
      permalink: "/post",
      title: "Hello",
      postedAt: new Date("2024-01-01"),
    },
  ]);
});

test("getRecentPosts excludes entries that are not discoverable", () => {
  const discoverable = entry("public", {
    frontmatter: { date: "2024-01-01" },
  });
  const unlisted = entry("unlisted", {
    routable: true,
    discoverable: false,
    frontmatter: { date: "2024-01-02" },
  });
  const draft = entry("draft", {
    routable: false,
    discoverable: false,
    frontmatter: { date: "2024-01-03" },
  });
  const future = entry("future", {
    routable: false,
    discoverable: false,
    frontmatter: { date: "2999-01-01" },
  });

  const all = [discoverable, unlisted, draft, future];
  const discovery = [discoverable];

  assert.deepEqual(
    getRecentPosts({ manifest: manifest(all, discovery) }).map(
      (post) => post.slug,
    ),
    ["public"],
  );
});

test("getRecentPosts keeps localized permalinks and titles", () => {
  const entries = [
    entry("post", { title: "English", frontmatter: { date: "2024-01-01" } }),
    entry("post.ja", {
      permalink: "/ja/post",
      title: "日本語",
      frontmatter: { date: "2024-01-02" },
    }),
  ];

  const result = getRecentPosts({ manifest: manifest(entries, entries) });
  assert.deepEqual(
    result.map((post) => [post.permalink, post.title]),
    [
      ["/ja/post", "日本語"],
      ["/post", "English"],
    ],
  );
});

test("getRecentPosts returns an empty list for no entries", () => {
  assert.deepEqual(getRecentPosts({ manifest: manifest([], []) }), []);
});

test("recentPostsPlugin registers its stylesheet", () => {
  assert.deepEqual(recentPostsPlugin().assets, [
    {
      pluginName: "recent-posts",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-recent-posts/style.css",
    },
  ]);
});

test("recentPostsPlugin declares a global output dependency", () => {
  assert.deepEqual(recentPostsPlugin().outputDependencies, [
    { type: "global" },
  ]);
});

test("a post date change regenerates the index with only the plugin dependency", () => {
  const dependencies = recentPostsPlugin().outputDependencies;
  assert.ok(dependencies);
  const previousEntries = [
    entry("index"),
    entry("post", { frontmatter: { date: "2024-01-01" } }),
  ];
  const currentEntries = [
    entry("index"),
    entry("post", { frontmatter: { date: "2024-02-01" } }),
  ];

  const result = determineOutputChanges({
    manifest: manifest(currentEntries, currentEntries),
    previousState: previousOutputState(previousEntries, dependencies),
    changeSet: {
      added: [],
      changed: ["post.md"],
      removed: [],
      unchanged: ["index.md"],
    },
    affectedContent: { direct: new Set(["post"]), dependent: new Set() },
    contentOutputDependencies: dependencies,
  });

  assert.deepEqual(paths(result.affected), ["index.html", "post.html"]);
});

test("RecentPosts renders nothing without posts", () => {
  assert.equal(RecentPosts({ posts: [] }), null);
});

test("RecentPosts renders English labels and dates", () => {
  const html = renderToString(
    RecentPosts({
      posts: [
        {
          slug: "post",
          permalink: "/post",
          title: "Hello",
          postedAt: new Date(2024, 0, 5, 12, 0, 0),
        },
      ],
    }),
  );

  assert.ok(html.includes("Recent Posts"), html);
  assert.ok(html.includes("01/05/2024"), html);
  assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9faf]/);
});

type EntryOptions = {
  permalink?: string;
  title?: string;
  frontmatter?: Record<string, unknown>;
  routable?: boolean;
  discoverable?: boolean;
};

function entry(slug: string, options: EntryOptions = {}): ContentManifestEntry {
  const permalink = options.permalink ?? (slug === "index" ? "/" : `/${slug}`);
  const routable = options.routable ?? true;
  const discoverable = options.discoverable ?? routable;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: options.title ?? slug,
    frontmatter: options.frontmatter ?? {},
    publishing: {
      visibility: discoverable ? "public" : routable ? "unlisted" : "draft",
      routable,
      discoverable,
    },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifest(
  entries: ContentManifestEntry[],
  discoverable: ContentManifestEntry[] = entries,
): ContentManifest {
  return {
    entries,
    publicEntries: entries.filter((entry) => entry.publishing.routable),
    discoverableEntries: discoverable,
    publicRedirects: new Map(),
    generatedOutputs: [],
  } as unknown as ContentManifest;
}

function previousOutputState(
  entries: ContentManifestEntry[],
  dependencies: readonly OutputDependency[],
) {
  return {
    version: 1,
    entries: {},
    contentIndex: {},
    manifestEntries: entries,
    outputs: buildOutputInventory(manifest(entries), [], dependencies),
  };
}

function paths(outputs: readonly OutputDescriptor[]): string[] {
  return outputs.map((output) => output.path).sort();
}
