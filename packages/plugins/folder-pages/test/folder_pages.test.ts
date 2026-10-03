import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOutputInventory,
  ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentSource,
  determineOutputChanges,
  type OutputDescriptor,
  type ResolvedRiebeckiteConfig,
  type RiebeckitePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { breadcrumbs, buildBreadcrumbItems } from "../../breadcrumbs/index.ts";
import { docs } from "../../docs/index.ts";
import { buildFolderPages, folderPages } from "../index.js";

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

function config(
  plugins: readonly RiebeckitePlugin<unknown>[],
): ResolvedRiebeckiteConfig {
  return resolveConfig({
    site: { title: "Test", baseUrl: "https://example.com" },
    content: { filters: { publishStrategy: "explicit" } },
    plugins: [...plugins],
  });
}

function manager(
  files: Record<string, string>,
  plugins: readonly RiebeckitePlugin<unknown>[] = [folderPages()],
): ContentManager {
  return new ContentManager(source(files), [], { config: config(plugins) });
}

test("collapses a README folder entry to the folder URL and redirects the old URL", async () => {
  const content = manager({
    "folder/README.md": "---\ntitle: Folder\npublish: true\n---\n# Folder\n",
  });

  const locations = await content.getContentLocations();
  assert.equal(locations.get("folder/README")?.permalink, "/folder/");

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("folder/README")?.permalink, "/folder/");
  assert.equal(manifest.redirects.get("/folder/README")?.status, 301);
  assert.equal(manifest.redirects.get("/folder/README")?.slug, "folder/README");
  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/folder/"), null);
});

test("collapses a root README entry to the site root and redirects the old URL", async () => {
  const content = manager({
    "README.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
  });

  const locations = await content.getContentLocations();
  assert.equal(locations.get("README")?.permalink, "/");

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("README")?.permalink, "/");
  assert.equal(manifest.redirects.get("/README")?.status, 301);
});

test("keeps a root index entry at the site root", async () => {
  const content = manager({
    "index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
  });

  const locations = await content.getContentLocations();
  assert.equal(locations.get("index")?.permalink, "/");

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("index")?.permalink, "/");
  assert.equal(manifest.redirects.has("/index"), false);
});

test("collapses an index folder entry to the folder URL and redirects the old URL", async () => {
  const content = manager({
    "folder/index.md": "---\ntitle: Folder\npublish: true\n---\n# Folder\n",
  });

  const locations = await content.getContentLocations();
  assert.equal(locations.get("folder/index")?.permalink, "/folder/");

  const manifest = await content.getManifest();
  assert.equal(manifest.redirects.get("/folder/index")?.status, 301);
  assert.equal(manifest.redirects.get("/folder/index")?.slug, "folder/index");
  assert.deepEqual(await content.getPagePaths(), []);
});

test("does not collapse a folder when README and index both exist", async () => {
  const content = manager({
    "folder/README.md": "---\ntitle: Readme\npublish: true\n---\n",
    "folder/index.md": "---\ntitle: Index\npublish: true\n---\n",
  });

  const locations = await content.getContentLocations();
  assert.equal(locations.get("folder/README")?.permalink, "/folder/README");
  assert.equal(locations.get("folder/index")?.permalink, "/folder/index");

  const manifest = await content.getManifest();
  assert.equal(manifest.redirects.size, 0);
  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/folder/"), null);
});

test("keeps folder.md as a normal content page", async () => {
  const content = manager({
    "folder.md": "---\ntitle: Folder\npublish: true\n---\n",
    "folder/page.md": "---\ntitle: Page\npublish: true\n---\n",
  });

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("folder")?.permalink, "/folder");
  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/folder/"), null);
});

test("generates a folder page that lists only direct children", async () => {
  const content = manager({
    "folder/page.md": "---\ntitle: Page\npublish: true\n---\n",
    "folder/sub/deep.md": "---\ntitle: Deep\npublish: true\n---\n",
  });

  assert.deepEqual(await content.getPagePaths(), ["/folder/", "/folder/sub/"]);

  const folder = await content.resolvePage("/folder/");
  assert.equal(folder?.type, "folder-page");
  assert.equal(folder?.title, "folder");
  assert.match(folder?.body ?? "", /href="\/folder\/page"/);
  assert.match(
    folder?.body ?? "",
    /<a class="rr-folder-page__link" href="\/folder\/sub\/">sub<\/a>/,
  );
  assert.doesNotMatch(folder?.body ?? "", /\/folder\/sub\/deep/);

  const sub = await content.resolvePage("/folder/sub/");
  assert.match(sub?.body ?? "", /href="\/folder\/sub\/deep"/);
});

test("does not generate a folder page from conflicting custom public locations", async () => {
  const content = manager(
    {
      "docs/foo/a.md": "---\ntitle: A\npublish: true\n---\n",
      "docs/foo/b.md": "---\ntitle: B\npublish: true\n---\n",
    },
    [
      {
        name: "custom-locations",
        resolveContentLocations: ({ entries }) =>
          entries.map((entry) => ({
            slug: entry.slug,
            permalink: entry.slug === "docs/foo/a" ? "/articles/a" : "/notes/b",
          })),
      },
      folderPages(),
    ],
  );

  const paths = await content.getPagePaths();
  assert.equal(paths.includes("/articles/"), false);
  assert.equal(paths.includes("/notes/"), false);
  assert.equal(paths.includes("/docs/foo/"), false);
});

test("does not generate a trailing-slash route owned by folder.md", async () => {
  const content = manager(
    {
      "folder.md": "---\ntitle: Folder\npublish: true\n---\n",
      "folder/page.md": "---\ntitle: Page\npublish: true\n---\n",
    },
    [
      {
        name: "custom-locations",
        resolveContentLocations: ({ entries }) =>
          entries.map((entry) => ({
            slug: entry.slug,
            permalink: entry.slug === "folder" ? "/foo" : "/foo/page",
          })),
      },
      folderPages(),
    ],
  );

  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/foo/"), null);
});

test("declares folder dependencies for generated page outputs", async () => {
  const content = manager({
    "folder/page.md": "---\ntitle: Page\npublish: true\n---\n",
    "folder/sub/deep.md": "---\ntitle: Deep\npublish: true\n---\n",
  });

  const changes = await content.getOutputChangeSet();
  const pages = [...changes.affected, ...changes.unchanged].filter(
    (output) => output.kind === "plugin-page",
  );

  assert.deepEqual(
    pages.map((output) => output.path),
    ["folder/index.html", "folder/sub/index.html"],
  );
  assert.deepEqual(pages[0].dependencies, [
    { type: "folder", folder: "folder" },
    { type: "folder", folder: "folder/sub" },
  ]);
  assert.deepEqual(pages[1].dependencies, [
    { type: "folder", folder: "folder/sub" },
  ]);
});

test("lists only discoverable content in generated folder pages", async () => {
  const content = manager({
    "folder/public.md": "---\ntitle: Public\npublish: true\n---\n",
    "folder/unlisted.md": "---\ntitle: Unlisted\nvisibility: unlisted\n---\n",
    "folder/draft.md": "---\ntitle: Draft\nvisibility: draft\n---\n",
    "folder/scheduled.md":
      "---\ntitle: Scheduled\npublishAt: 2999-01-01T00:00:00.000Z\n---\n",
  });

  const manifest = await content.getManifest();
  assert.equal(
    manifest.bySlug.get("folder/unlisted")?.publishing.routable,
    true,
  );
  assert.equal(
    manifest.bySlug.get("folder/unlisted")?.publishing.discoverable,
    false,
  );

  const page = await content.resolvePage("/folder/");
  const body = page?.body ?? "";
  assert.match(body, /Public/);
  assert.doesNotMatch(body, /Unlisted/);
  assert.doesNotMatch(body, /Draft/);
  assert.doesNotMatch(body, /Scheduled/);
});

test("does not create a folder page when nothing is discoverable", async () => {
  const content = manager({
    "folder/unlisted.md": "---\ntitle: Unlisted\nvisibility: unlisted\n---\n",
  });

  assert.deepEqual(await content.getPagePaths(), []);
});

test("keeps locales separated and resolves redirects after localization", async () => {
  const content = manager(
    {
      "ja/docs/plugins/README.md":
        "---\ntitle: プラグイン\npublish: true\n---\n",
      "en/docs/plugins/README.md": "---\ntitle: Plugins\npublish: true\n---\n",
      "ja/docs/ref/a.md": "---\ntitle: A\npublish: true\n---\n",
      "en/docs/ref/b.md": "---\ntitle: B\npublish: true\n---\n",
    },
    [folderPages(), l10n({ defaultLang: "ja", languages: ["ja", "en"] })],
  );

  const locations = await content.getContentLocations();
  assert.equal(
    locations.get("ja/docs/plugins/README")?.permalink,
    "/docs/plugins/",
  );
  assert.equal(
    locations.get("en/docs/plugins/README")?.permalink,
    "/en/docs/plugins/",
  );

  const manifest = await content.getManifest();
  assert.equal(
    manifest.redirects.get("/docs/plugins/README")?.slug,
    "ja/docs/plugins/README",
  );
  assert.equal(
    manifest.redirects.get("/en/docs/plugins/README")?.slug,
    "en/docs/plugins/README",
  );
  assert.equal(manifest.redirects.has("/ja/docs/plugins/README"), false);

  const paths = await content.getPagePaths();
  assert.ok(paths.includes("/docs/ref/"));
  assert.ok(paths.includes("/en/docs/ref/"));

  const japanese = await content.resolvePage("/docs/ref/");
  assert.match(japanese?.body ?? "", /\/docs\/ref\/a/);
  assert.doesNotMatch(japanese?.body ?? "", /\/en\/docs\/ref\/b/);

  const english = await content.resolvePage("/en/docs/ref/");
  assert.match(english?.body ?? "", /\/en\/docs\/ref\/b/);
  assert.doesNotMatch(english?.body ?? "", /\/docs\/ref\/a/);
});

test("aligns localized folder pages, breadcrumbs, and docs navigation", async () => {
  const content = manager(
    {
      "ja/docs/README.md": "---\ntitle: 日本語 docs\npublish: true\n---\n",
      "ja/docs/guide/page.md": "---\ntitle: 日本語 page\npublish: true\n---\n",
      "en/docs/README.md": "---\ntitle: English docs\npublish: true\n---\n",
      "en/docs/guide/page.md": "---\ntitle: English page\npublish: true\n---\n",
    },
    [
      folderPages(),
      l10n({ defaultLang: "ja", languages: ["ja", "en"] }),
      breadcrumbs(),
      docs({ root: "docs" }),
    ],
  );

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("ja/docs/README")?.permalink, "/docs/");
  assert.equal(manifest.bySlug.get("en/docs/README")?.permalink, "/en/docs/");
  assert.ok((await content.getPagePaths()).includes("/docs/guide/"));
  assert.ok((await content.getPagePaths()).includes("/en/docs/guide/"));

  const japanese = manifest.bySlug.get("ja/docs/guide/page")?.html ?? "";
  const english = manifest.bySlug.get("en/docs/guide/page")?.html ?? "";
  assert.match(japanese, /href="\/docs\/"/);
  assert.match(japanese, /href="\/docs\/guide\/"/);
  assert.doesNotMatch(japanese, /href="\/ja\//);
  assert.match(english, /href="\/en\/docs\/"/);
  assert.match(english, /href="\/en\/docs\/guide\/"/);
  assert.doesNotMatch(english, /href="\/ja\//);
});

test("builds breadcrumbs from canonical landing page locations", async () => {
  const plugins = [
    folderPages(),
    breadcrumbs({ homeLabel: "Riebeckite Documentation" }),
  ];
  const content = manager(
    {
      "README.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
      "docs/README.md": "---\ntitle: Docs\npublish: true\n---\n# Docs\n",
      "docs/reference/README.md":
        "---\ntitle: Reference\npublish: true\n---\n# Reference\n",
      "docs/guide/setup.md": "---\ntitle: Setup\npublish: true\n---\n# Setup\n",
    },
    plugins,
  );

  const manifest = await content.getManifest();
  assert.equal(manifest.bySlug.get("README")?.permalink, "/");
  assert.equal(manifest.bySlug.get("docs/README")?.permalink, "/docs/");
  assert.equal(
    manifest.bySlug.get("docs/reference/README")?.permalink,
    "/docs/reference/",
  );

  const reference = manifest.bySlug.get("docs/reference/README");
  assert.ok(reference);
  assert.deepEqual(
    buildBreadcrumbItems({
      manifest,
      entry: reference,
      config: config(plugins),
      homeLabel: "Riebeckite Documentation",
    }),
    [
      { name: "Riebeckite Documentation", url: "/" },
      { name: "Docs", url: "/docs/" },
      { name: "Reference", url: "/docs/reference/" },
    ],
  );

  const setup = manifest.bySlug.get("docs/guide/setup");
  assert.ok(setup);
  assert.deepEqual(
    buildBreadcrumbItems({
      manifest,
      entry: setup,
      config: config(plugins),
      homeLabel: "Riebeckite Documentation",
    }),
    [
      { name: "Riebeckite Documentation", url: "/" },
      { name: "Docs", url: "/docs/" },
      { name: "Guide", url: "/docs/guide/" },
      { name: "Setup", url: "/docs/guide/setup" },
    ],
  );
});

test("coexists with taxonomy regardless of plugin order", async () => {
  const files = {
    "folder/page.md": "---\ntitle: Page\npublish: true\n---\n",
    "guides/intro.md":
      "---\ntitle: Intro\npublish: true\ntags:\n  - featured\n---\n",
  };

  const forward = manager(files, [taxonomy(), folderPages()]);
  const reversed = manager(files, [folderPages(), taxonomy()]);
  const forwardPaths = await forward.getPagePaths();
  const reversedPaths = await reversed.getPagePaths();

  assert.deepEqual([...forwardPaths].sort(), [...reversedPaths].sort());
  assert.ok(forwardPaths.includes("/folder/"));
  assert.ok(forwardPaths.includes("/tags/featured"));
  assert.ok(forwardPaths.includes("/folders/guides"));
  assert.equal((await forward.resolvePage("/folder/"))?.type, "folder-page");
  assert.equal(
    (await forward.resolvePage("/folders/guides"))?.type,
    "taxonomy-term",
  );

  const changes = await forward.getOutputChangeSet();
  const outputPaths = [...changes.affected, ...changes.unchanged].map(
    (output) => output.path,
  );
  assert.equal(new Set(outputPaths).size, outputPaths.length);
});

test("invalidates only the affected folder page when a child is added", () => {
  const previous = manifestOf(
    note("folder/a", { title: "A" }),
    note("other/x", { title: "X" }),
  );
  const current = manifestOf(
    note("folder/a", { title: "A" }),
    note("folder/b", { title: "B" }),
    note("other/x", { title: "X" }),
  );

  const result = changes(previous, current, { added: ["folder/b.md"] });
  const affected = outputPaths(result.affected);

  assert.ok(affected.includes("folder/index.html"));
  assert.ok(affected.includes("folder/b.html"));
  assert.ok(outputPaths(result.unchanged).includes("other/index.html"));
  assert.equal(result.fullRegenerationRequired, false);
});

test("removes the folder page output when its last discoverable child disappears", () => {
  const previous = manifestOf(note("folder/a"));
  const current = manifestOf();

  const result = changes(previous, current, { removed: ["folder/a.md"] });

  assert.ok(outputPaths(result.removed).includes("folder/index.html"));
  assert.equal(result.fullRegenerationRequired, false);
});

test("moves folder page invalidation when a child is renamed", () => {
  const previous = manifestOf(note("folder/old", { title: "Old" }));
  const current = manifestOf(note("folder/new", { title: "New" }));

  const result = changes(previous, current, {
    added: ["folder/new.md"],
    removed: ["folder/old.md"],
  });

  assert.ok(outputPaths(result.affected).includes("folder/index.html"));
  assert.ok(outputPaths(result.removed).includes("folder/old.html"));
});

test("invalidates the folder page when a child title changes", () => {
  const previous = manifestOf(note("folder/a", { title: "A" }));
  const current = manifestOf(note("folder/a", { title: "A2" }));

  const result = changes(previous, current, { changed: ["folder/a.md"] });
  const affected = outputPaths(result.affected);

  assert.ok(affected.includes("folder/index.html"));
  assert.ok(affected.includes("folder/a.html"));
});

test("invalidates the folder page when a child publishing state changes", () => {
  const published = changes(
    manifestOf(note("folder/a")),
    manifestOf(note("folder/a", { visibility: "unlisted" })),
    { changed: ["folder/a.md"] },
  );
  assert.ok(outputPaths(published.removed).includes("folder/index.html"));
  assert.equal(published.fullRegenerationRequired, false);

  const drafted = changes(
    manifestOf(note("folder/a", { visibility: "draft" })),
    manifestOf(note("folder/a")),
    { changed: ["folder/a.md"] },
  );
  assert.ok(outputPaths(drafted.affected).includes("folder/index.html"));
});

test("invalidates ancestor folder pages when a nested child is removed", () => {
  const previous = manifestOf(note("a/keep"), note("a/b/c/page"));
  const current = manifestOf(note("a/keep"));

  const result = changes(previous, current, { removed: ["a/b/c/page.md"] });
  const currentPaths = buildOutputInventory(
    current,
    pluginOutputs(current),
  ).map((output) => output.path);
  const incrementalPaths = [...result.affected, ...result.unchanged].map(
    (output) => output.path,
  );

  assert.ok(outputPaths(result.affected).includes("a/index.html"));
  assert.deepEqual(incrementalPaths.sort(), currentPaths.sort());
});

test("invalidates ancestor folder pages for nested additions, renames, and publishing changes", () => {
  const added = changes(
    manifestOf(note("a/keep")),
    manifestOf(note("a/keep"), note("a/b/c/page")),
    { added: ["a/b/c/page.md"] },
  );
  const renamed = changes(
    manifestOf(note("a/keep"), note("a/b/c/old")),
    manifestOf(note("a/keep"), note("a/b/c/new")),
    { added: ["a/b/c/new.md"], removed: ["a/b/c/old.md"] },
  );
  const unpublished = changes(
    manifestOf(note("a/keep"), note("a/b/c/page")),
    manifestOf(note("a/keep"), note("a/b/c/page", { visibility: "draft" })),
    { changed: ["a/b/c/page.md"] },
  );

  for (const result of [added, renamed, unpublished]) {
    assert.ok(outputPaths(result.affected).includes("a/index.html"));
  }
});

function note(
  slug: string,
  options: {
    title?: string;
    visibility?: "public" | "unlisted" | "draft";
  } = {},
): ContentManifestEntry {
  const visibility = options.visibility ?? "public";
  const routable = visibility === "public" || visibility === "unlisted";
  const discoverable = visibility === "public";
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}` },
    title: options.title ?? slug,
    frontmatter: { title: options.title ?? slug },
    publishing: { visibility, routable, discoverable },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(...entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries.filter((entry) => entry.publishing.routable),
    discoverableEntries: entries.filter(
      (entry) => entry.publishing.discoverable,
    ),
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    byContentId: new Map(),
    byAlias: new Map(),
    byPermalink: new Map(entries.map((entry) => [entry.permalink, entry])),
    byRoutablePermalink: new Map(
      entries
        .filter((entry) => entry.publishing.routable)
        .map((entry) => [entry.permalink, entry]),
    ),
    redirects: new Map(),
    publicRedirects: new Map(),
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
    folderLocations: new Map(),
    pageRoutes: [],
    pagePaths: [],
  };
}

function pluginOutputs(manifest: ContentManifest): OutputDescriptor[] {
  const model = buildFolderPages(manifest);
  return model.paths.map((pathname) => ({
    kind: "plugin-page" as const,
    path: pathname,
    producer: "plugin:folder-pages:page:folder-page",
    dependencies: model.byPath.get(pathname)?.dependencies ?? [],
  }));
}

function changes(
  previous: ContentManifest,
  current: ContentManifest,
  change: { added?: string[]; changed?: string[]; removed?: string[] },
) {
  const changeSet = {
    added: change.added ?? [],
    changed: change.changed ?? [],
    removed: change.removed ?? [],
    unchanged: [],
  };
  const previousState = {
    version: 5,
    entries: {},
    contentIndex: {},
    manifestEntries: previous.entries,
    outputs: buildOutputInventory(previous, pluginOutputs(previous)),
  };
  return determineOutputChanges({
    manifest: current,
    previousState,
    changeSet,
    affectedContent: {
      direct: new Set(
        [...changeSet.added, ...changeSet.changed, ...changeSet.removed].map(
          (path) => path.replace(/\.md$/, ""),
        ),
      ),
      dependent: new Set(),
    },
    pluginPageOutputs: pluginOutputs(current),
  });
}

function outputPaths(outputs: readonly OutputDescriptor[]): string[] {
  return [...outputs].map((output) => output.path).sort();
}
