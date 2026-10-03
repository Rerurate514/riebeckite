import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOutputInventory,
  type ContentManifest,
  type ContentManifestEntry,
  determineOutputChanges,
  type OutputDependency,
  type OutputDescriptor,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { getRecentPosts, RecentPosts, recentPostsPlugin } from "../index.ts";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

type Processed = { frontmatter: Record<string, unknown> };

function harness(
  posts: Array<{ slug: string; permalink: string }>,
  processed: Record<string, Processed>,
) {
  const calls: string[] = [];
  return {
    calls,
    args: {
      posts,
      config,
      getProcessedContent: async (slug: string) => {
        calls.push(slug);
        return processed[slug] ?? { frontmatter: {} };
      },
      resolveTitle: (slug: string, title: unknown) =>
        typeof title === "string" ? title : slug,
    },
  };
}

function published(date: string | Date): Processed {
  return { frontmatter: { publish: true, date } };
}

test("getRecentPosts sorts newest first and applies the default limit of five", async () => {
  const slugs = ["a", "b", "c", "d", "e", "f", "g"];
  const posts = slugs.map((slug) => ({ slug, permalink: `/${slug}` }));
  const processed = Object.fromEntries(
    slugs.map((slug, index) => [
      slug,
      published(`2024-01-${String(index + 1).padStart(2, "0")}`),
    ]),
  );

  const result = await getRecentPosts(harness(posts, processed).args);

  assert.equal(result.length, 5);
  assert.deepEqual(
    result.map((post) => post.slug),
    ["g", "f", "e", "d", "c"],
  );
  assert.equal(result[0]?.permalink, "/g");
});

test("getRecentPosts honors an explicit limit", async () => {
  const harnessed = harness(
    [
      { slug: "a", permalink: "/a" },
      { slug: "b", permalink: "/b" },
    ],
    { a: published("2024-01-01"), b: published("2024-01-02") },
  );

  const result = await getRecentPosts({ ...harnessed.args, limit: 1 });
  assert.deepEqual(
    result.map((post) => post.slug),
    ["b"],
  );

  assert.deepEqual(await getRecentPosts({ ...harnessed.args, limit: 0 }), []);
});

test("getRecentPosts skips the index slug without reading it", async () => {
  const harnessed = harness(
    [
      { slug: "index", permalink: "/" },
      { slug: "post", permalink: "/post" },
    ],
    { post: published("2024-01-01") },
  );

  const result = await getRecentPosts(harnessed.args);
  assert.deepEqual(
    result.map((post) => post.slug),
    ["post"],
  );
  assert.deepEqual(harnessed.calls, ["post"]);
});

test("getRecentPosts drops notes with unusable dates", async () => {
  const harnessed = harness(
    [
      { slug: "bad", permalink: "/bad" },
      { slug: "undated", permalink: "/undated" },
      { slug: "good", permalink: "/good" },
    ],
    {
      bad: { frontmatter: { publish: true, date: "not-a-date" } },
      undated: { frontmatter: { publish: true } },
      good: published("2024-01-01"),
    },
  );

  const result = await getRecentPosts(harnessed.args);
  assert.deepEqual(
    result.map((post) => post.slug),
    ["good"],
  );
});

test("getRecentPosts falls back to created and preserves Date instances", async () => {
  const explicit = new Date("2024-06-06T00:00:00.000Z");
  const harnessed = harness(
    [
      { slug: "created", permalink: "/created" },
      { slug: "date-object", permalink: "/date-object" },
    ],
    {
      created: { frontmatter: { publish: true, created: "2024-05-05" } },
      "date-object": { frontmatter: { publish: true, date: explicit } },
    },
  );

  const result = await getRecentPosts(harnessed.args);
  assert.equal(result[0]?.slug, "date-object");
  assert.equal(result[0]?.postedAt, explicit);
  assert.equal(result[1]?.postedAt.toISOString(), "2024-05-05T00:00:00.000Z");
});

test("getRecentPosts passes slug and frontmatter title to the resolver", async () => {
  const harnessed = harness([{ slug: "post", permalink: "/post" }], {
    post: { frontmatter: { publish: true, date: "2024-01-01", title: "Hi" } },
  });
  harnessed.args.resolveTitle = (slug, title) => `[${slug}] ${String(title)}`;

  const result = await getRecentPosts(harnessed.args);
  assert.deepEqual(result, [
    {
      slug: "post",
      permalink: "/post",
      title: "[post] Hi",
      postedAt: new Date("2024-01-01"),
    },
  ]);
});

test("getRecentPosts returns an empty list for no posts", async () => {
  assert.deepEqual(await getRecentPosts(harness([], {}).args), []);
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
    entry("post", { date: "2024-01-01" }),
  ];
  const currentEntries = [
    entry("index"),
    entry("post", { date: "2024-02-01" }),
  ];

  const result = determineOutputChanges({
    manifest: manifest(currentEntries),
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

function manifest(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
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

function entry(
  slug: string,
  frontmatter: Record<string, unknown> = {},
): ContentManifestEntry {
  const permalink = slug === "index" ? "/" : `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function paths(outputs: readonly OutputDescriptor[]): string[] {
  return outputs.map((output) => output.path).sort();
}
