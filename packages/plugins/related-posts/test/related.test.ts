import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { assertGoldenJson } from "../../../../tests/helpers/golden.ts";
import {
  buildRelatedPosts,
  CO_CITATION_WEIGHT,
  DIRECT_LINK_WEIGHT,
  isEligibleRelatedEntry,
  resolveRelatedPostsOptions,
  SHARED_TAG_WEIGHT,
} from "../index.ts";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const explicitConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

async function manifestOf(files: Record<string, string>) {
  return await new ContentManager(source(files), [], {
    config: explicitConfig,
  }).getManifest();
}

function entryOf(
  manifest: ContentManifest,
  slug: string,
): ContentManifestEntry {
  const entry = manifest.bySlug.get(slug);
  assert.ok(entry, `missing entry ${slug}`);
  return entry;
}

async function relatedFor(
  files: Record<string, string>,
  slug: string,
  options = resolveRelatedPostsOptions(),
) {
  const manifest = await manifestOf(files);
  return buildRelatedPosts({
    manifest,
    entry: entryOf(manifest, slug),
    options,
    config: explicitConfig,
  });
}

function makeEntry(
  overrides: Partial<ContentManifestEntry> & { slug: string },
): ContentManifestEntry {
  const permalink = overrides.slug === "index" ? "/" : `/${overrides.slug}`;
  return {
    slug: overrides.slug,
    permalink,
    publicLocation: { slug: overrides.slug, permalink },
    title: overrides.slug,
    frontmatter: {},
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

test("scores an outgoing direct link with DIRECT_LINK_WEIGHT", async () => {
  const related = await relatedFor(
    {
      "source.md": "---\npublish: true\n---\n# Source\n\n[[friend]]",
      "friend.md": "---\npublish: true\ntitle: Friend\n---\n# Friend",
    },
    "source",
  );

  assert.deepEqual(related, [
    {
      slug: "friend",
      permalink: "/friend",
      title: "Friend",
      score: DIRECT_LINK_WEIGHT,
    },
  ]);
});

test("scores an incoming direct link with DIRECT_LINK_WEIGHT", async () => {
  const related = await relatedFor(
    {
      "source.md": "---\npublish: true\n---\n# Source",
      "friend.md":
        "---\npublish: true\ntitle: Friend\n---\n# Friend\n\n[[source]]",
    },
    "source",
  );

  assert.deepEqual(related, [
    {
      slug: "friend",
      permalink: "/friend",
      title: "Friend",
      score: DIRECT_LINK_WEIGHT,
    },
  ]);
});

test("adds SHARED_TAG_WEIGHT once per shared tag", async () => {
  const related = await relatedFor(
    {
      "source.md": "---\npublish: true\ntags: [alpha, beta]\n---\n# Source",
      "twin.md":
        "---\npublish: true\ntitle: Twin\ntags: [alpha, beta]\n---\n# Twin",
    },
    "source",
  );

  assert.equal(related.length, 1);
  assert.equal(related[0].score, 2 * SHARED_TAG_WEIGHT);
});

test("adds CO_CITATION_WEIGHT per shared outgoing target", async () => {
  const related = await relatedFor(
    {
      "source.md": "---\npublish: true\n---\n# Source\n\n[[hub]]",
      "hub.md": "---\npublish: true\ntitle: Hub\n---\n# Hub",
      "cousin.md":
        "---\npublish: true\ntitle: Cousin\n---\n# Cousin\n\n[[hub]]",
    },
    "source",
  );

  assert.deepEqual(related, [
    { slug: "hub", permalink: "/hub", title: "Hub", score: DIRECT_LINK_WEIGHT },
    {
      slug: "cousin",
      permalink: "/cousin",
      title: "Cousin",
      score: CO_CITATION_WEIGHT,
    },
  ]);
});

test("ranks by score, then title, then slug", async () => {
  const related = await relatedFor(
    {
      "source.md": "---\npublish: true\ntags: [shared]\n---\n# Source",
      "zulu.md": "---\npublish: true\ntitle: Alpha\ntags: [shared]\n---\n# A",
      "alpha.md": "---\npublish: true\ntitle: Beta\ntags: [shared]\n---\n# B",
      "bravo.md": "---\npublish: true\ntitle: Gamma\ntags: [shared]\n---\n# C",
    },
    "source",
  );

  assert.deepEqual(
    related.map((item) => item.title),
    ["Alpha", "Beta", "Gamma"],
  );
});

test("respects the limit and the minimum score", async () => {
  const files: Record<string, string> = {
    "source.md": "---\npublish: true\ntags: [x]\n---\n# Source",
  };
  for (let i = 1; i <= 7; i += 1) {
    files[`c${i}.md`] =
      `---\npublish: true\ntitle: C${i}\ntags: [x]\n---\n# C${i}`;
  }

  const limited = await relatedFor(
    files,
    "source",
    resolveRelatedPostsOptions({ limit: 2 }),
  );
  assert.deepEqual(
    limited.map((item) => item.slug),
    ["c1", "c2"],
  );

  const filtered = await relatedFor(
    files,
    "source",
    resolveRelatedPostsOptions({ minScore: 3 }),
  );
  assert.deepEqual(filtered, []);
});

test("disabling a signal removes it from scoring", async () => {
  const tagOnly = await relatedFor(
    {
      "source.md": "---\npublish: true\ntags: [x]\n---\n# Source",
      "tagged.md":
        "---\npublish: true\ntitle: Tagged\ntags: [x]\n---\n# Tagged",
    },
    "source",
    resolveRelatedPostsOptions({ useTags: false }),
  );
  assert.deepEqual(tagOnly, []);

  const linkOnly = await relatedFor(
    {
      "source.md": "---\npublish: true\n---\n# Source\n\n[[friend]]",
      "friend.md": "---\npublish: true\ntitle: Friend\n---\n# Friend",
    },
    "source",
    resolveRelatedPostsOptions({ useBacklinks: false }),
  );
  assert.deepEqual(linkOnly, []);
});

test("never recommends the source entry itself", async () => {
  const related = await relatedFor(
    {
      "source.md":
        "---\npublish: true\n---\n# Source\n\n[[source]] and [[friend]]",
      "friend.md": "---\npublish: true\ntitle: Friend\n---\n# Friend",
    },
    "source",
  );

  assert.deepEqual(
    related.map((item) => item.slug),
    ["friend"],
  );
});

test("excludes ineligible candidates when a config is supplied", async () => {
  const files = {
    "source.md": "---\npublish: true\ntags: [x]\n---\n# Source",
    "secret.md": "---\ntitle: Secret\ntags: [x]\n---\n# Secret\n\n[[source]]",
  };

  const withConfig = await relatedFor(files, "source");
  assert.deepEqual(withConfig, []);

  const manifest = await manifestOf(files);
  const withoutConfig = buildRelatedPosts({
    manifest,
    entry: entryOf(manifest, "source"),
    options: resolveRelatedPostsOptions(),
  });
  assert.deepEqual(
    withoutConfig.map((item) => item.slug),
    ["secret"],
  );
});

test("isEligibleRelatedEntry rejects redirect-shadowed permalinks", () => {
  const entry = makeEntry({ slug: "old" });
  const manifest = {
    redirects: new Map([
      [
        entry.permalink,
        { path: entry.permalink, status: 301, slug: entry.slug },
      ],
    ]),
  } as unknown as ContentManifest;

  assert.equal(isEligibleRelatedEntry(entry, manifest, explicitConfig), false);
});

test("isEligibleRelatedEntry applies the config publish strategy", () => {
  const manifest = { redirects: new Map() } as unknown as ContentManifest;

  assert.equal(
    isEligibleRelatedEntry(
      makeEntry({ slug: "yes", frontmatter: { publish: true } }),
      manifest,
      explicitConfig,
    ),
    true,
  );
  assert.equal(
    isEligibleRelatedEntry(makeEntry({ slug: "no" }), manifest, explicitConfig),
    false,
  );
});

test("isEligibleRelatedEntry falls back to private/draft/publish flags", () => {
  const manifest = { redirects: new Map() } as unknown as ContentManifest;

  assert.equal(
    isEligibleRelatedEntry(makeEntry({ slug: "plain" }), manifest),
    true,
  );
  assert.equal(
    isEligibleRelatedEntry(
      makeEntry({ slug: "private", frontmatter: { private: true } }),
      manifest,
    ),
    false,
  );
  assert.equal(
    isEligibleRelatedEntry(
      makeEntry({ slug: "draft", frontmatter: { draft: true } }),
      manifest,
    ),
    false,
  );
  assert.equal(
    isEligibleRelatedEntry(
      makeEntry({ slug: "off", frontmatter: { publish: false } }),
      manifest,
    ),
    false,
  );
});

test("matches a structured ranking across all signals", async () => {
  const related = await relatedFor(
    {
      "source.md":
        "---\npublish: true\ntags: [shared]\n---\n# Source\n\n[[direct]] and [[hub]]",
      "direct.md": "---\npublish: true\ntitle: Direct\n---\n# Direct",
      "hub.md": "---\npublish: true\ntitle: Hub\n---\n# Hub",
      "tagged.md":
        "---\npublish: true\ntitle: Tagged\ntags: [shared]\n---\n# Tagged",
      "co.md": "---\npublish: true\ntitle: Co\n---\n# Co\n\n[[hub]]",
    },
    "source",
  );

  assertGoldenJson(
    related,
    new URL("./__golden__/ranking.json", import.meta.url),
  );
});
