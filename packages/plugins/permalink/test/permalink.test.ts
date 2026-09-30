import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentLocationInput,
  PluginContentLocationContext,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { type PermalinkOptions, permalink } from "../index.ts";

function input(
  slug: string,
  markdown = "",
  path = `${slug}.md`,
): ContentLocationInput {
  return { slug, path, markdown };
}

async function resolve(
  entries: ContentLocationInput[],
  options: PermalinkOptions = {},
) {
  const plugin = permalink(options);
  const resolver = plugin.resolveContentLocations;
  assert.ok(resolver);
  const context = { entries } as unknown as PluginContentLocationContext;
  return await resolver(context);
}

test("uses the required frontmatter id with the default /n flat path", async () => {
  const [location] = await resolve([
    input("hello", "---\nid: hello\n---\nbody"),
  ]);

  assert.equal(location?.slug, "hello");
  assert.equal(location?.permalink, "/n/hello");
  assert.equal(location?.metadata?.id, "hello");
  assert.equal(location?.metadata?.idSource, "frontmatter");
  assert.deepEqual(location?.redirects, []);
});

test("derives a stable hash id when frontmatter id is missing", async () => {
  const [first] = await resolve([input("posts/hello")]);
  const [again] = await resolve([input("posts/hello")]);
  const [other] = await resolve([input("posts/other")]);

  assert.match(first?.metadata?.id ?? "", /^[A-Za-z0-9_-]{12}$/);
  assert.equal(first?.metadata?.idSource, "derived");
  assert.equal(first?.permalink, `/n/${first?.metadata?.id}`);
  assert.equal(first?.metadata?.id, again?.metadata?.id);
  assert.notEqual(first?.metadata?.id, other?.metadata?.id);
});

test("frontmatter strategy requires an id and rejects blank ids", async () => {
  await assert.rejects(
    resolve([input("a")], { id: { strategy: "frontmatter" } }),
    /Permalink ID is required in frontmatter field "id"/,
  );
  await assert.rejects(
    resolve([input("a", "---\nid: '   '\n---\n")], {
      id: { strategy: "frontmatter" },
    }),
    /Permalink ID is required/,
  );

  const [location] = await resolve([input("a", "---\nid: kept\n---\n")], {
    id: { strategy: "frontmatter" },
  });
  assert.equal(location?.metadata?.id, "kept");
});

test("a custom resolveId wins and is marked as custom", async () => {
  const [location] = await resolve([input("a")], {
    resolveId: () => "custom-id",
  });

  assert.equal(location?.permalink, "/n/custom-id");
  assert.equal(location?.metadata?.id, "custom-id");
  assert.equal(location?.metadata?.idSource, "custom");

  await assert.rejects(
    resolve([input("a")], { resolveId: () => "bad/id" }),
    /Invalid permalink ID "bad\/id" in a\.md/,
  );
});

test("preserve and append path modes use the slug hierarchy", async () => {
  const [preserved] = await resolve(
    [input("guide/intro", "---\nid: intro\n---\n")],
    { path: { mode: "preserve", prefix: "/docs" } },
  );
  const [appended] = await resolve(
    [input("guide/intro", "---\nid: intro\n---\n")],
    { path: { mode: "append", prefix: "/blog" } },
  );

  assert.equal(preserved?.permalink, "/docs/guide/intro");
  assert.equal(appended?.permalink, "/blog/guide/intro/intro");
});

test("index segments collapse (or stay) depending on the option", async () => {
  const [collapsed] = await resolve(
    [input("guide/index", "---\nid: home\n---\n")],
    { path: { mode: "preserve", prefix: "/" } },
  );
  const [kept] = await resolve([input("guide/index", "---\nid: home\n---\n")], {
    path: { mode: "preserve", prefix: "/" },
    index: { collapse: false },
  });
  const [appended] = await resolve(
    [input("guide/index", "---\nid: home\n---\n")],
    { path: { mode: "append", prefix: "/" } },
  );

  assert.equal(collapsed?.permalink, "/guide/home");
  assert.equal(kept?.permalink, "/guide/index/home");
  assert.equal(appended?.permalink, "/guide/home");
});

test("normalizes the prefix, trailing slash and path segments", async () => {
  const [bare] = await resolve([input("a", "---\nid: x\n---\n")], {
    path: { prefix: "/blog" },
  });
  const [root] = await resolve([input("a", "---\nid: x\n---\n")], {
    path: { prefix: "/" },
  });
  const [slashed] = await resolve([input("a", "---\nid: x\n---\n")], {
    path: { prefix: "/n", trailingSlash: true },
  });
  const [unicode] = await resolve([input("日本/語", "---\nid: café\n---\n")], {
    path: { mode: "preserve", prefix: "/" },
  });

  assert.equal(bare?.permalink, "/blog/x");
  assert.equal(root?.permalink, "/x");
  assert.equal(slashed?.permalink, "/n/x/");
  assert.equal(unicode?.permalink, "/%E6%97%A5%E6%9C%AC/caf%C3%A9");
});

test("an override permalink replaces the composed path", async () => {
  const [location] = await resolve([
    input("a", "---\nid: kept\npermalink: /custom/page\n---\n"),
  ]);

  assert.equal(location?.permalink, "/custom/page");
  assert.equal(location?.metadata?.id, "kept");
  assert.equal(location?.metadata?.idSource, "frontmatter");

  const [withoutId] = await resolve([
    input("a", "---\npermalink: /custom/page\n---\n"),
  ]);
  assert.equal(withoutId?.permalink, "/custom/page");
  assert.equal(withoutId?.metadata, undefined);

  await assert.rejects(
    resolve([input("a", "---\npermalink: relative/path\n---\n")]),
    /Invalid permalink path/,
  );
});

test("redirects accept a string or string array with the configured status", async () => {
  const [single] = await resolve([
    input("a", "---\nid: a\nredirect_from: /old-a\n---\n"),
  ]);
  const [multiple] = await resolve(
    [input("b", "---\nid: b\nredirect_from: [/old-1, /old-2]\n---\n")],
    { redirects: { status: 301 } },
  );

  assert.deepEqual(single?.redirects, [{ path: "/old-a", status: 308 }]);
  assert.deepEqual(multiple?.redirects, [
    { path: "/old-1", status: 301 },
    { path: "/old-2", status: 301 },
  ]);
});

test("a malformed redirect value is rejected", async () => {
  await assert.rejects(
    resolve([input("a", "---\nid: a\nredirect_from: 5\n---\n")]),
    /Permalink redirect field must be a string or string array/,
  );
  await assert.rejects(
    resolve([input("a", "---\nid: a\nredirect_from: old-path\n---\n")]),
    /Invalid permalink path/,
  );
});

test("duplicate ids and permalinks are reported as collisions", async () => {
  await assert.rejects(
    resolve([
      input("a", "---\nid: dup\n---\n", "a.md"),
      input("b", "---\nid: dup\n---\n", "b.md"),
    ]),
    /Permalink ID collision: dup[\s\S]*a\.md[\s\S]*b\.md/,
  );

  await assert.rejects(
    resolve([
      input("a", "---\npermalink: /same\n---\n", "a.md"),
      input("b", "---\npermalink: /same\n---\n", "b.md"),
    ]),
    /Permalink URL collision: \/same/,
  );

  await assert.rejects(
    resolve([
      input("a", "---\nid: a\nredirect_from: /n/b\n---\n"),
      input("b", "---\nid: b\n---\n"),
    ]),
    /Permalink URL collision: \/n\/b/,
  );
});

test("frontmatter edge cases: missing, BOM, invalid objects and non-strings", async () => {
  const [derived] = await resolve([input("a", "no frontmatter here")]);
  assert.equal(derived?.metadata?.idSource, "derived");

  const [bom] = await resolve([input("a", "\uFEFF---\nid: bom\n---\n")]);
  assert.equal(bom?.metadata?.id, "bom");

  await assert.rejects(
    resolve([input("a", "---\njust a scalar\n---\n")]),
    /Invalid frontmatter object: a\.md/,
  );
  await assert.rejects(
    resolve([input("a", "---\nid: 42\n---\n")]),
    /Permalink frontmatter field "id" must be a string/,
  );
});

test("invalid option values fail fast at plugin creation", () => {
  assert.throws(() => permalink({ id: { length: 5 } }), /from 6 through 43/);
  assert.throws(() => permalink({ id: { length: 44 } }), /from 6 through 43/);
  assert.throws(() => permalink({ id: { length: 6.5 } }), /from 6 through 43/);
  assert.throws(
    () => permalink({ path: { mode: "weird" as never } }),
    /Invalid permalink path mode/,
  );
  assert.throws(
    () => permalink({ redirects: { status: 303 as never } }),
    /Invalid permalink redirect status/,
  );
  assert.throws(
    () => permalink({ override: { frontmatter: "a.b" } }),
    /must be top-level/,
  );
  assert.throws(
    () => permalink({ path: { prefix: "blog" } }),
    /Invalid permalink path/,
  );
});

test("a custom resolvePath controls the final path", async () => {
  const [location] = await resolve([input("a", "---\nid: x\n---\n")], {
    resolvePath: ({ id }) => `/pages/${id}`,
  });

  assert.equal(location?.permalink, "/pages/x");

  await assert.rejects(
    resolve([input("a", "---\nid: x\n---\n")], {
      resolvePath: () => "not-absolute",
    }),
    /Invalid permalink path/,
  );
});

test("golden: default resolution over a structured set of notes", async () => {
  const locations = await resolve([
    input("index", "---\nid: home\n---\n# Home"),
    input(
      "notes/hello",
      "---\nid: hello\nredirect_from: [/old/hello, /legacy/hello]\n---\n",
    ),
    input("notes/derived", "# Derived"),
    input(
      "notes/aliased",
      "---\nid: aliased\npermalink: /custom/aliased\n---\n",
    ),
  ]);

  assertGoldenJson(
    locations,
    new URL("./__golden__/locations.json", import.meta.url),
  );
});

test("golden: preserve mode with trailing slash and custom fields", async () => {
  const locations = await resolve(
    [
      input(
        "docs/guide/index",
        "---\nkey: guide\nredirect_from: /old-guide\n---\n",
      ),
      input("docs/guide/intro", "---\nkey: intro\n---\n"),
    ],
    {
      frontmatter: "key",
      path: { mode: "preserve", prefix: "/docs", trailingSlash: true },
      redirects: { status: 301 },
    },
  );

  assertGoldenJson(
    locations,
    new URL("./__golden__/preserve.json", import.meta.url),
  );
});
