import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
} from "../src/content/content_build_state.js";
import type { ContentChangeSet } from "../src/content/content_change_set.js";
import {
  buildOutputInventory,
  determineOutputChanges,
  type OutputDescriptor,
} from "../src/content/output_dependency.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentRedirect,
} from "../src/types/content_manifest.js";

test("independent content edit affects own page and global outputs only", () => {
  const previous = manifest([entry("a"), entry("b")]);
  const current = manifest([entry("a", { title: "A2" }), entry("b")], {
    generatedOutputs: [
      {
        path: "feed.xml",
        content: "",
        owner: "feed",
        dependencies: [{ type: "global" }],
      },
    ],
  });
  const result = changes(previous, current, { changed: ["a.md"] });

  assert.deepEqual(paths(result.affected), ["a.html", "feed.xml"]);
  assert.deepEqual(paths(result.removed), []);
  assert.equal(result.fullRegenerationRequired, false);
});

test("manifest plugin global dependencies affect every content output", () => {
  const previous = manifest([entry("a"), entry("b")]);
  const current = manifest([entry("a", { title: "A2" }), entry("b")]);
  const result = determineOutputChanges({
    manifest: current,
    previousState: {
      version: 4,
      entries: {},
      contentIndex: {},
      manifestEntries: previous.entries,
      outputs: [],
    },
    changeSet: { added: [], changed: ["a.md"], removed: [], unchanged: [] },
    affectedContent: { direct: new Set(["a"]), dependent: new Set() },
    contentOutputDependencies: [{ type: "global" }],
  });

  assert.deepEqual(paths(result.affected), ["a.html", "b.html"]);
});

test("manifest plugin unknown dependencies require safe full regeneration", () => {
  const current = manifest([entry("a"), entry("b")]);
  const result = determineOutputChanges({
    manifest: current,
    previousState: undefined,
    changeSet: {
      added: [],
      changed: [],
      removed: [],
      unchanged: ["a.md", "b.md"],
    },
    affectedContent: { direct: new Set(), dependent: new Set() },
    contentOutputDependencies: [{ type: "unknown" }],
  });

  assert.equal(result.fullRegenerationRequired, true);
});

test("wikilink changes affect old and new backlink target pages", () => {
  const previous = manifest([
    entry("source", { links: ["old"] }),
    entry("old"),
    entry("new"),
  ]);
  const current = manifest([
    entry("source", { links: ["new"] }),
    entry("old"),
    entry("new"),
  ]);
  const result = changes(previous, current, { changed: ["source.md"] });

  assert.deepEqual(paths(result.affected), [
    "new.html",
    "old.html",
    "source.html",
  ]);
});

test("embed dependency changes affect embedding page", () => {
  const previous = manifest([
    entry("source", { links: ["embed"] }),
    entry("embed"),
  ]);
  const current = manifest([
    entry("source", { links: ["embed"] }),
    entry("embed", { title: "Embed 2" }),
  ]);
  const result = changes(previous, current, {
    changed: ["embed.md"],
    dependent: ["source"],
  });

  assert.deepEqual(paths(result.affected), ["embed.html", "source.html"]);
});

test("tag changes affect old and new taxonomy plugin pages", () => {
  const previous = manifest([entry("note", { tags: ["old"] })]);
  const current = manifest([entry("note", { tags: ["new"] })]);
  const result = changes(previous, current, { changed: ["note.md"] }, [
    pluginPage("tags/old", [{ type: "tag", tag: "old" }]),
    pluginPage("tags/new", [{ type: "tag", tag: "new" }]),
    pluginPage("tags/stable", [{ type: "tag", tag: "stable" }]),
  ]);

  assert.deepEqual(paths(result.affected), [
    "note.html",
    "tags/new.html",
    "tags/old.html",
  ]);
});

test("add affects new page and collection or global outputs", () => {
  const previous = manifest([entry("a")]);
  const current = manifest([entry("a"), entry("folder/b")]);
  const result = changes(previous, current, { added: ["folder/b.md"] }, [
    pluginPage("folder", [{ type: "folder", folder: "folder" }]),
    pluginPage("feed", [{ type: "global" }]),
  ]);

  assert.deepEqual(paths(result.affected), [
    "feed.html",
    "folder.html",
    "folder/b.html",
  ]);
});

test("delete reports removed page and affected derived outputs", () => {
  const previous = manifest([
    entry("a"),
    entry("folder/b", { tags: ["gone"] }),
  ]);
  const current = manifest([entry("a")]);
  const result = changes(previous, current, { removed: ["folder/b.md"] }, [
    pluginPage("tags/gone", [{ type: "tag", tag: "gone" }]),
    pluginPage("folder", [{ type: "folder", folder: "folder" }]),
  ]);

  assert.deepEqual(paths(result.affected), ["folder.html", "tags/gone.html"]);
  assert.deepEqual(paths(result.removed), ["folder/b.html"]);
});

test("rename and move remove old output and affect new output", () => {
  const previous = manifest([entry("old/path")]);
  const current = manifest([entry("new/path")]);
  const result = changes(previous, current, {
    added: ["new/path.md"],
    removed: ["old/path.md"],
  });

  assert.deepEqual(paths(result.affected), ["new/path.html"]);
  assert.deepEqual(paths(result.removed), ["old/path.html"]);
});

test("alias and redirect outputs follow public redirect lifecycle", () => {
  const previous = manifest([
    entry("note", { redirects: [{ path: "/old", status: 308 }] }),
  ]);
  const current = manifest([
    entry("note", { redirects: [{ path: "/older", status: 308 }] }),
  ]);
  const result = changes(previous, current, { changed: ["note.md"] });

  assert.deepEqual(paths(result.affected), ["note.html", "older.html"]);
  assert.deepEqual(paths(result.removed), ["old.html"]);
});

test("page type dependencies can narrow affected plugin pages", () => {
  const previous = manifest([entry("a"), entry("b")]);
  const current = manifest([entry("a", { title: "A2" }), entry("b")]);
  const result = changes(previous, current, { changed: ["a.md"] }, [
    pluginPage("preview/a", [{ type: "content", slug: "a" }]),
    pluginPage("preview/b", [{ type: "content", slug: "b" }]),
  ]);

  assert.deepEqual(paths(result.affected), ["a.html", "preview/a.html"]);
  assert.deepEqual(paths(result.unchanged), ["b.html", "preview/b.html"]);
});

test("plugin-generated outputs use declared dependencies", () => {
  const outputs = [
    {
      path: "a.json",
      content: "",
      owner: "data",
      dependencies: [{ type: "content" as const, slug: "a" }],
    },
    {
      path: "b.json",
      content: "",
      owner: "data",
      dependencies: [{ type: "content" as const, slug: "b" }],
    },
  ];
  const previous = manifest([entry("a"), entry("b")], {
    generatedOutputs: outputs,
  });
  const current = manifest([entry("a", { title: "A2" }), entry("b")], {
    generatedOutputs: outputs,
  });
  const result = changes(previous, current, { changed: ["a.md"] });

  assert.deepEqual(paths(result.affected), ["a.html", "a.json"]);
  assert.deepEqual(paths(result.unchanged), ["b.html", "b.json"]);
});

test("plugin or config change can request full output regeneration", () => {
  const current = manifest([entry("a"), entry("b")]);
  const result = determineOutputChanges({
    manifest: current,
    previousState: undefined,
    changeSet: {
      added: ["a.md", "b.md"],
      changed: [],
      removed: [],
      unchanged: [],
    },
    affectedContent: { direct: new Set(["a", "b"]), dependent: new Set() },
  });

  assert.deepEqual(paths(result.affected), ["a.html", "b.html"]);
  assert.equal(result.candidateOutputCount, 2);
});

test("unknown dependency fallback marks output affected and requires full regeneration", () => {
  const previous = manifest([entry("a"), entry("b")]);
  const current = manifest([entry("a", { title: "A2" }), entry("b")], {
    generatedOutputs: [{ path: "plugin.bin", content: "", owner: "plugin" }],
  });
  const result = changes(previous, current, { changed: ["a.md"] }, [
    pluginPage("custom", [{ type: "unknown" }]),
  ]);

  assert.deepEqual(paths(result.affected), [
    "a.html",
    "custom.html",
    "plugin.bin",
  ]);
  assert.equal(result.fullRegenerationRequired, true);
});

test("directory-index plugin pages emit index outputs", () => {
  const outputs = buildOutputInventory(manifest([]), [
    pluginPage("folder", []),
    pluginPage("folder/", []),
  ]);

  assert.deepEqual(
    outputs
      .filter((output) => output.kind === "plugin-page")
      .map((output) => output.path),
    ["folder.html", "folder/index.html"],
  );
});

function changes(
  previousManifest: ContentManifest,
  currentManifest: ContentManifest,
  change: Partial<ContentChangeSet> & { dependent?: readonly string[] },
  pluginPageOutputs: readonly OutputDescriptor[] = [],
) {
  const previousState: ContentBuildState = {
    version: CONTENT_BUILD_STATE_VERSION,
    entries: Object.fromEntries(
      previousManifest.entries.map((item) => [
        `${item.slug}.md`,
        {
          fingerprint: item.title,
          aliases: [],
          dependencies: [],
          linkTargets: [],
        },
      ]),
    ),
    contentIndex: {},
    manifestEntries: previousManifest.entries,
    outputs: [
      ...determineOutputChanges({
        manifest: previousManifest,
        previousState: undefined,
        changeSet: {
          added: previousManifest.entries.map((item) => `${item.slug}.md`),
          changed: [],
          removed: [],
          unchanged: [],
        },
        affectedContent: {
          direct: new Set(previousManifest.entries.map((item) => item.slug)),
          dependent: new Set(),
        },
        pluginPageOutputs,
      }).affected,
    ],
  };
  const changeSet: ContentChangeSet = {
    added: change.added ?? [],
    changed: change.changed ?? [],
    removed: change.removed ?? [],
    unchanged: change.unchanged ?? [],
  };
  return determineOutputChanges({
    manifest: currentManifest,
    previousState,
    changeSet,
    affectedContent: {
      direct: new Set(
        [...changeSet.added, ...changeSet.changed, ...changeSet.removed].map(
          (item) => item.replace(/\.md$/, ""),
        ),
      ),
      dependent: new Set(change.dependent ?? []),
    },
    pluginPageOutputs,
  });
}

function manifest(
  entries: readonly ContentManifestEntry[],
  options: Partial<ContentManifest> = {},
): ContentManifest {
  const publicRedirects = new Map<string, ContentRedirect & { slug: string }>();
  for (const item of entries) {
    for (const redirect of item.publicLocation.redirects ?? []) {
      publicRedirects.set(redirect.path, { ...redirect, slug: item.slug });
    }
  }
  return {
    entries: [...entries],
    publicEntries: [...entries],
    discoverableEntries: [...entries],
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    byContentId: new Map(),
    byPermalink: new Map(entries.map((item) => [item.permalink, item])),
    byRoutablePermalink: new Map(entries.map((item) => [item.permalink, item])),
    redirects: publicRedirects,
    publicRedirects,
    byTag: new Map(),
    byAsset: new Map(),
    outgoingLinks: new Map(),
    incomingLinks: new Map(),
    contentIndex: new Map(),
    graph: {} as ContentManifest["graph"],
    assets: [],
    clientEntries: [],
    diagnostics: [],
    generatedOutputs: [],
    pagePaths: [],
    ...options,
  };
}

function entry(
  slug: string,
  options: {
    title?: string;
    tags?: readonly string[];
    links?: readonly string[];
    redirects?: readonly ContentRedirect[];
  } = {},
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: {
      slug,
      permalink: `/${slug}`,
      redirects: options.redirects,
    },
    title: options.title ?? slug,
    frontmatter: { title: options.title ?? slug },
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: [...(options.tags ?? [])],
    links: (options.links ?? []).map((target) => ({
      raw: target,
      slug: target,
      kind: "note",
      embed: false,
    })),
    backlinks: [],
    assets: [],
  };
}

function pluginPage(
  path: string,
  dependencies: OutputDescriptor["dependencies"],
): OutputDescriptor {
  return {
    kind: "plugin-page",
    path,
    producer: "plugin:test:page",
    dependencies,
  };
}

function paths(outputs: readonly OutputDescriptor[]): string[] {
  return outputs.map((output) => output.path).sort();
}
