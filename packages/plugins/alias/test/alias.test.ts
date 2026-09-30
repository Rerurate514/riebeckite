import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentLocationInput,
  ContentPublicLocation,
  PluginContentLocationAugmentContext,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { type AliasOptions, alias, resolveAliasPath } from "../index.ts";
import { resolveAliasOptions } from "../src/alias.ts";

function entry(
  slug: string,
  markdown: string,
  path = `${slug}.md`,
): ContentLocationInput {
  return { slug, path, markdown };
}

function location(slug: string, permalink: string): ContentPublicLocation {
  return { slug, permalink };
}

async function apply(
  entries: ContentLocationInput[],
  locations: ContentPublicLocation[],
  options: AliasOptions = {},
): Promise<PluginContentLocationAugmentContext> {
  const plugin = alias(options);
  const hook = plugin.extendContentLocations;
  assert.ok(hook);
  const context = {
    entries,
    locations: new Map(locations.map((item) => [item.slug, item])),
    diagnostics: [],
  } as unknown as PluginContentLocationAugmentContext;
  await hook(context);
  return context;
}

test("resolveAliasPath normalizes aliases into site-local paths", () => {
  assert.equal(resolveAliasPath("Old Name"), "/Old%20Name");
  assert.equal(resolveAliasPath("/Old Name"), "/Old%20Name");
  assert.equal(resolveAliasPath("Folder/Note"), "/Folder/Note");
  assert.equal(
    resolveAliasPath("日本語 ノート"),
    "/%E6%97%A5%E6%9C%AC%E8%AA%9E%20%E3%83%8E%E3%83%BC%E3%83%88",
  );
  assert.equal(resolveAliasPath("%41"), "/A");
  assert.equal(resolveAliasPath("///trailing"), "/trailing");
  assert.equal(resolveAliasPath("a%2Fb"), "/a%2Fb");
});

test("resolveAliasPath rejects aliases that cannot be a URL path", () => {
  for (const bad of [
    "",
    "   ",
    "/",
    "//",
    "a//b",
    "a#b",
    "a?b",
    "a\\b",
    ".",
    "..",
    "a/../b",
    "%zz",
  ]) {
    assert.equal(
      resolveAliasPath(bad),
      null,
      `expected null for ${JSON.stringify(bad)}`,
    );
  }
  assert.equal(resolveAliasPath("ok"), "/ok");
});

test("resolveAliasOptions defaults to 308 and validates the status", () => {
  assert.deepEqual(resolveAliasOptions({}), { status: 308 });
  assert.deepEqual(resolveAliasOptions({ status: 301 }), { status: 301 });
  assert.throws(
    () => resolveAliasOptions({ status: 303 as never }),
    /Invalid alias redirect status: 303/,
  );
});

test("adds a redirect per alias without touching the canonical permalink", async () => {
  const context = await apply(
    [entry("note", "---\naliases:\n  - Old Name\n  - /legacy\n---\n")],
    [location("note", "/n/note")],
  );

  assert.equal(context.locations.get("note")?.permalink, "/n/note");
  assert.deepEqual(context.locations.get("note")?.redirects, [
    { path: "/Old%20Name", status: 308 },
    { path: "/legacy", status: 308 },
  ]);
  assert.deepEqual(context.diagnostics, []);
});

test("reads the singular alias frontmatter key", async () => {
  const context = await apply(
    [entry("note", "---\nalias: Old Name\n---\n")],
    [location("note", "/n/note")],
  );

  assert.deepEqual(context.locations.get("note")?.redirects, [
    { path: "/Old%20Name", status: 308 },
  ]);
  assert.deepEqual(context.diagnostics, []);
});

test("reads inline and block alias lists with the configured status", async () => {
  const context = await apply(
    [
      entry("note", "---\naliases: [Solo, Team Note]\n---\n"),
      entry("other", "---\naliases:\n  - Legacy Note\n---\n"),
    ],
    [location("note", "/n/note"), location("other", "/n/other")],
    { status: 301 },
  );

  assert.deepEqual(
    context.locations.get("note")?.redirects?.map((redirect) => redirect.path),
    ["/Solo", "/Team%20Note"],
  );
  assert.deepEqual(
    context.locations.get("other")?.redirects?.map((redirect) => redirect.path),
    ["/Legacy%20Note"],
  );
  assert.ok(
    context.locations
      .get("note")
      ?.redirects?.every((redirect) => redirect.status === 301),
  );
});

test("ignores aliases that already point at the same note", async () => {
  const owner = location("note", "/n/note");
  owner.redirects = [{ path: "/already-there", status: 308 }];

  const context = await apply(
    [entry("note", "---\naliases: [n/note, already-there]\n---\n")],
    [owner],
  );

  assert.deepEqual(context.locations.get("note")?.redirects, [
    { path: "/already-there", status: 308 },
  ]);
  assert.deepEqual(context.diagnostics, []);
});

test("warns and skips an alias owned by another note", async () => {
  const context = await apply(
    [entry("other", "---\naliases: Taken\n---\n")],
    [location("owner", "/Taken"), location("other", "/n/other")],
  );

  assert.equal(context.locations.get("other")?.redirects, undefined);
  assert.equal(context.diagnostics.length, 1);
  assert.equal(context.diagnostics[0]?.code, "alias-collision");
  assert.equal(context.diagnostics[0]?.severity, "warning");
  assert.equal(context.diagnostics[0]?.slug, "other");
  assert.equal(context.diagnostics[0]?.target, "/Taken");
  assert.equal(context.diagnostics[0]?.meta?.conflictSlug, "owner");
  assert.equal(context.diagnostics[0]?.meta?.alias, "Taken");
});

test("treats another note's redirect as an owner too", async () => {
  const owner = location("owner", "/n/owner");
  owner.redirects = [{ path: "/shared", status: 308 }];

  const context = await apply(
    [entry("other", "---\naliases: shared\n---\n")],
    [owner, location("other", "/n/other")],
  );

  assert.equal(context.locations.get("other")?.redirects, undefined);
  assert.equal(context.diagnostics.length, 1);
  assert.equal(context.diagnostics[0]?.code, "alias-collision");
  assert.equal(context.diagnostics[0]?.meta?.conflictSlug, "owner");
});

test("warns and skips an alias that cannot be a URL path", async () => {
  const context = await apply(
    [entry("note", "---\naliases: ['bad#hash', good]\n---\n")],
    [location("note", "/n/note")],
  );

  assert.equal(context.diagnostics.length, 1);
  assert.equal(context.diagnostics[0]?.code, "alias-invalid");
  assert.equal(context.diagnostics[0]?.severity, "warning");
  assert.equal(context.diagnostics[0]?.meta?.alias, "bad#hash");
  assert.deepEqual(context.locations.get("note")?.redirects, [
    { path: "/good", status: 308 },
  ]);
});

test("skips entries without a resolved location", async () => {
  const context = await apply(
    [entry("ghost", "---\naliases: Ghost\n---\n")],
    [location("real", "/real")],
  );

  assert.deepEqual(context.diagnostics, []);
  assert.equal(context.locations.get("ghost"), undefined);
});

test("deduplicates repeated aliases", async () => {
  const context = await apply(
    [entry("note", "---\naliases: [Twice, Twice]\n---\n")],
    [location("note", "/n/note")],
  );

  assert.deepEqual(context.locations.get("note")?.redirects, [
    { path: "/Twice", status: 308 },
  ]);
});

test("only the first note claims a shared alias", async () => {
  const context = await apply(
    [
      entry("a", "---\naliases: Shared\n---\n"),
      entry("b", "---\naliases: Shared\n---\n"),
    ],
    [location("a", "/n/a"), location("b", "/n/b")],
  );

  assert.deepEqual(context.locations.get("a")?.redirects, [
    { path: "/Shared", status: 308 },
  ]);
  assert.equal(context.locations.get("b")?.redirects, undefined);
  assert.equal(context.diagnostics.length, 1);
  assert.equal(context.diagnostics[0]?.code, "alias-collision");
  assert.equal(context.diagnostics[0]?.slug, "b");
  assert.equal(context.diagnostics[0]?.meta?.conflictSlug, "a");
});

test("golden: aliases, collisions and invalid aliases together", async () => {
  const context = await apply(
    [
      entry("index", "---\naliases: [Home, Start Here]\n---\n"),
      entry(
        "notes/first",
        "---\naliases:\n  - First Note\n  - /notes/one\n---\n",
      ),
      entry("notes/second", "---\naliases: [Home, 'bad?alias']\n---\n"),
      entry("notes/third", "---\naliases: First Note\n---\n"),
    ],
    [
      location("index", "/"),
      location("notes/first", "/n/first"),
      location("notes/second", "/n/second"),
      location("notes/third", "/n/third"),
    ],
    { status: 301 },
  );

  const snapshot = {
    locations: [...context.locations.values()]
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
      .map((item) => ({
        slug: item.slug,
        permalink: item.permalink,
        redirects: item.redirects ?? [],
      })),
    diagnostics: context.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      slug: diagnostic.slug,
      target: diagnostic.target,
      meta: diagnostic.meta,
    })),
  };

  assertGoldenJson(
    snapshot,
    new URL("./__golden__/aliases.json", import.meta.url),
  );
});
