import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  resolveConfig,
} from "@riebeckite/core";
import type { WebmentionMention } from "../index.js";
import {
  createWebmentionFeedHandler,
  createWebmentionReceiveHandler,
  findTargetEntry,
  findTargetLink,
  getWebmentionsForEntry,
  groupMentionsBySlug,
  MemoryWebmentionProvider,
  parseWebmentionRequestBody,
  parseWebmentionSource,
  renderWebmentionSection,
  resolveWebmentionOptions,
  UnsupportedWebmentionQueryError,
  validateWebmentionOptions,
  verifyWebmention,
  webmention,
  webmentionTypeForRels,
} from "../index.js";

const SOURCE_URL = "https://source.example/entry";
const TARGET_URL = "https://target.example/post";

const SOURCE_HTML = `<!doctype html>
<html>
  <head>
    <title>Hello Source</title>
    <meta name="author" content="Ada Lovelace" />
    <meta property="article:published_time" content="2026-01-01T00:00:00.000Z" />
    <meta name="description" content="A short note about the target." />
  </head>
  <body>
    <p>Body copy that is longer than the description.</p>
    <a rel="like" href="https://target.example/post/">Likes this</a>
  </body>
</html>`;

function fetchSourceFrom(html: string) {
  return async (url: string) => (url === SOURCE_URL ? { url, html } : null);
}

function makeMention(
  overrides: Partial<WebmentionMention> = {},
): WebmentionMention {
  return {
    source: SOURCE_URL,
    target: TARGET_URL,
    type: "mention",
    verifiedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeConfig() {
  return resolveConfig({
    site: { title: "Test", baseUrl: "https://target.example" },
  });
}

function makeManifest(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
  } as unknown as ContentManifest;
}

function makeEntry(
  overrides: Partial<ContentManifestEntry> = {},
): ContentManifestEntry {
  return {
    slug: "post",
    permalink: "/post",
    title: "A Post",
    frontmatter: {},
    html: "<p>post</p>",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    publishing: { visibility: "public", routable: true, discoverable: true },
    publicLocation: { slug: "post", permalink: "/post" },
    ...overrides,
  } as ContentManifestEntry;
}

test("parses links and citation metadata from a source document", () => {
  const parsed = parseWebmentionSource(SOURCE_HTML, SOURCE_URL);
  assert.equal(parsed.title, "Hello Source");
  assert.equal(parsed.excerpt, "A short note about the target.");
  assert.equal(parsed.author?.name, "Ada Lovelace");
  assert.equal(parsed.publishedAt, "2026-01-01T00:00:00.000Z");
  const link = findTargetLink(parsed, TARGET_URL);
  assert.ok(link);
  assert.equal(link.normalized, "https://target.example/post/");
  assert.equal(webmentionTypeForRels(link.rels), "like");
});

test("verifies a source that links to the target", async () => {
  const result = await verifyWebmention({
    source: SOURCE_URL,
    target: TARGET_URL,
    fetchSource: fetchSourceFrom(SOURCE_HTML),
    verifiedAt: "2026-03-01T00:00:00.000Z",
  });
  assert.ok(result.ok);
  assert.equal(result.mention.type, "like");
  assert.equal(result.mention.verifiedAt, "2026-03-01T00:00:00.000Z");
  assert.equal(result.mention.title, "Hello Source");
});

test("rejects sources that do not link to the target", async () => {
  const result = await verifyWebmention({
    source: SOURCE_URL,
    target: TARGET_URL,
    fetchSource: fetchSourceFrom("<p>no links here</p>"),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "no_link_found");
});

test("rejects unreachable sources and invalid URLs", async () => {
  assert.deepEqual(
    await verifyWebmention({
      source: SOURCE_URL,
      target: TARGET_URL,
      fetchSource: async () => null,
    }),
    { ok: false, reason: "source_unreachable" },
  );
  assert.deepEqual(
    await verifyWebmention({
      source: "ftp://source.example/entry",
      target: TARGET_URL,
      fetchSource: fetchSourceFrom(SOURCE_HTML),
    }),
    { ok: false, reason: "invalid_source" },
  );
  assert.deepEqual(
    await verifyWebmention({
      source: SOURCE_URL,
      target: "javascript:alert(1)",
      fetchSource: fetchSourceFrom(SOURCE_HTML),
    }),
    { ok: false, reason: "invalid_target" },
  );
});

test("memory provider upserts and queries mentions", async () => {
  const provider = new MemoryWebmentionProvider();
  await provider.store(makeMention());
  await provider.store(makeMention({ type: "reply" }));
  const target = await provider.query({
    type: "mentions_for_target",
    target: TARGET_URL,
  });
  assert.equal(target.mentions.length, 1);
  assert.equal(target.mentions[0]?.type, "reply");

  await provider.store(
    makeMention({ source: "https://other.example/x", target: TARGET_URL }),
  );
  const all = await provider.query({ type: "all_mentions" });
  assert.equal(all.mentions.length, 2);
});

test("receive handler stores a verified mention and returns 202", async () => {
  const provider = new MemoryWebmentionProvider();
  const options = resolveWebmentionOptions({
    provider,
    fetchSource: fetchSourceFrom(SOURCE_HTML),
  });
  const handler = createWebmentionReceiveHandler(options, provider);
  const response = await handler({
    config: makeConfig(),
    manifest: makeManifest([makeEntry()]),
    request: {
      method: "POST",
      url: "https://target.example/webmentions",
      path: "/webmentions",
      query: {},
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `source=${encodeURIComponent(SOURCE_URL)}&target=${encodeURIComponent(
        "https://target.example/post",
      )}`,
    },
  });

  assert.equal(response.status, 202);
  const stored = await provider.query({
    type: "mentions_for_target",
    target: "https://target.example/post",
  });
  assert.equal(stored.mentions.length, 1);
  assert.equal(stored.mentions[0]?.type, "like");
});

test("receive handler rejects unknown targets and missing fields", async () => {
  const provider = new MemoryWebmentionProvider();
  const options = resolveWebmentionOptions({
    provider,
    fetchSource: fetchSourceFrom(SOURCE_HTML),
  });
  const handler = createWebmentionReceiveHandler(options, provider);
  const base = {
    config: makeConfig(),
    manifest: makeManifest([makeEntry()]),
    request: {
      method: "POST" as const,
      url: "https://target.example/webmentions",
      path: "/webmentions",
      query: {},
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "",
    },
  };

  const unknown = await handler({
    ...base,
    request: {
      ...base.request,
      body: `source=${SOURCE_URL}&target=https://target.example/missing`,
    },
  });
  assert.equal(unknown.status, 400);
  assert.deepEqual(unknown.json, { error: "target_not_found" });

  const missing = await handler({
    ...base,
    request: { ...base.request, body: `source=${SOURCE_URL}` },
  });
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.json, { error: "missing_source_or_target" });
});

test("receive handler reports unavailable storage without store support", async () => {
  const provider = {
    capabilities: new Set(["query"] as const),
    async store() {},
    async query() {
      return { type: "all_mentions" as const, mentions: [] };
    },
  };
  const options = resolveWebmentionOptions({ provider });
  const response = await createWebmentionReceiveHandler(
    options,
    provider,
  )({
    config: makeConfig(),
    manifest: makeManifest([makeEntry()]),
    request: {
      method: "POST",
      url: "https://target.example/webmentions",
      path: "/webmentions",
      query: {},
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `source=${SOURCE_URL}&target=${TARGET_URL}`,
    },
  });
  assert.equal(response.status, 503);
});

test("feed handler returns mentions with entry summaries", async () => {
  const provider = new MemoryWebmentionProvider([
    makeMention({ title: "Liked it" }),
  ]);
  const options = resolveWebmentionOptions({ provider });
  const handler = createWebmentionFeedHandler(options, provider);
  const response = await handler({
    config: makeConfig(),
    manifest: makeManifest([makeEntry()]),
    request: {
      method: "GET",
      url: "https://target.example/webmentions",
      path: "/webmentions",
      query: {},
      headers: {},
      body: "",
    },
  });

  assert.equal(response.status, undefined);
  const feed = response.json as {
    count: number;
    mentions: { entry: { permalink: string } | null }[];
  };
  assert.equal(feed.count, 1);
  assert.equal(feed.mentions[0]?.entry?.permalink, "/post");
});

test("feed handler rejects providers without query support", async () => {
  const provider = {
    capabilities: new Set(["store"] as const),
    async store() {},
    async query() {
      throw new UnsupportedWebmentionQueryError(
        { type: "all_mentions" },
        "query",
      );
    },
  };
  const options = resolveWebmentionOptions({ provider });
  const response = await createWebmentionFeedHandler(
    options,
    provider,
  )({
    config: makeConfig(),
    manifest: makeManifest([makeEntry()]),
    request: {
      method: "GET",
      url: "https://target.example/webmentions",
      path: "/webmentions",
      query: {},
      headers: {},
      body: "",
    },
  });
  assert.equal(response.status, 501);
});

test("getWebmentionsForEntry resolves a slug to its target", async () => {
  const provider = new MemoryWebmentionProvider([makeMention()]);
  const mentions = await getWebmentionsForEntry({
    manifest: makeManifest([makeEntry()]),
    config: makeConfig(),
    provider,
    slug: "post",
  });
  assert.equal(mentions.length, 1);
});

test("renders a mention section with stable rr-webmention hooks", () => {
  const options = resolveWebmentionOptions();
  const html = renderWebmentionSection(
    [makeMention({ type: "reply" })],
    options,
  );
  assert.match(html, /class="rr-webmention"/);
  assert.match(html, /data-webmention-count="1"/);
  assert.match(html, /rr-webmention__item--reply/);
  assert.match(html, /rel="nofollow ugc"/);
});

test("parses urlencoded and JSON request bodies", () => {
  assert.deepEqual(
    parseWebmentionRequestBody("source=a&target=b", {
      "content-type": "application/x-www-form-urlencoded",
    }),
    { source: "a", target: "b" },
  );
  assert.deepEqual(
    parseWebmentionRequestBody(JSON.stringify({ source: "a", target: "b" }), {
      "content-type": "application/json",
    }),
    { source: "a", target: "b" },
  );
  assert.equal(
    parseWebmentionRequestBody("{", { "content-type": "application/json" }),
    null,
  );
});

test("option validation reports unsafe values", () => {
  const issues = validateWebmentionOptions({
    endpoint: "webmentions",
    headingText: "  ",
    limit: -1,
    timeoutMs: 0,
    allowedTargets: ["not-a-url"],
  });
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["endpoint", "headingText", "limit", "timeoutMs", "allowedTargets.0"],
  );
  assert.deepEqual(validateWebmentionOptions(undefined), []);
});

test("plugin declares receive and feed endpoints without client config", () => {
  const provider = new MemoryWebmentionProvider();
  const plugin = webmention({ provider });
  assert.equal(plugin.name, "webmention");
  assert.deepEqual(
    plugin.endpoints?.map((endpoint) => [endpoint.method, endpoint.path]),
    [
      ["POST", "/webmentions"],
      ["GET", "/webmentions"],
    ],
  );
  assert.equal(plugin.clientEntries, undefined);
});

test("findTargetEntry ignores entries that are not routable", () => {
  const manifest = makeManifest([
    makeEntry(),
    makeEntry({
      slug: "secret",
      permalink: "/secret",
      publicLocation: { slug: "secret", permalink: "/secret" },
      publishing: { visibility: "draft", routable: false, discoverable: false },
    }),
  ]);
  const config = makeConfig();

  assert.ok(
    findTargetEntry(manifest, config, "https://target.example/post"),
    "expected the public target to resolve",
  );
  assert.equal(
    findTargetEntry(manifest, config, "https://target.example/secret"),
    undefined,
  );
});

test("groupMentionsBySlug omits mentions targeting non-routable entries", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "secret",
      permalink: "/secret",
      publicLocation: { slug: "secret", permalink: "/secret" },
      publishing: { visibility: "draft", routable: false, discoverable: false },
    }),
  ]);

  const grouped = groupMentionsBySlug(manifest, makeConfig(), [
    makeMention({ target: "https://target.example/secret" }),
  ]);

  assert.equal(grouped.size, 0);
});
