import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveFolderEntry,
  resolveFolderLocation,
  resolveGeneratedFolderLocation,
} from "../src/content/folder_entry.js";
import type { PublishingVisibility } from "../src/content/publishing.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../src/types/content_manifest.js";

const FOLDER = "docs/getting-started";

test("resolves a readme entry", () => {
  const manifest = manifestOf(entry(`${FOLDER}/README`));
  const resolution = resolveFolderEntry(manifest, FOLDER);

  assert.equal(resolution.type, "resolved");
  assert.equal(resolution.type === "resolved" && resolution.kind, "readme");
  assert.equal(
    resolution.type === "resolved" && resolution.entry,
    manifest.bySlug.get(`${FOLDER}/README`),
  );
});

test("resolves an index entry", () => {
  const manifest = manifestOf(entry(`${FOLDER}/index`));
  const resolution = resolveFolderEntry(manifest, FOLDER);

  assert.equal(resolution.type, "resolved");
  assert.equal(resolution.type === "resolved" && resolution.kind, "index");
  assert.equal(
    resolution.type === "resolved" && resolution.entry,
    manifest.bySlug.get(`${FOLDER}/index`),
  );
});

test("resolves a folder section entry", () => {
  const manifest = manifestOf(entry(FOLDER));
  const resolution = resolveFolderEntry(manifest, FOLDER);

  assert.equal(resolution.type, "resolved");
  assert.equal(resolution.type === "resolved" && resolution.kind, "folder");
  assert.equal(
    resolution.type === "resolved" && resolution.entry,
    manifest.bySlug.get(FOLDER),
  );
});

test("resolves to none when no candidate exists", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry("other/note")),
    FOLDER,
  );

  assert.deepEqual(resolution, { type: "none" });
});

test("readme and index are ambiguous rather than implicitly ordered", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`), entry(`${FOLDER}/index`)),
    FOLDER,
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["readme", "index"]);
});

test("readme and folder entry are ambiguous", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`), entry(FOLDER)),
    FOLDER,
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["readme", "folder"]);
});

test("index and folder entry are ambiguous", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/index`), entry(FOLDER)),
    FOLDER,
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["index", "folder"]);
});

test("readme, index, and folder entry are all ambiguous", () => {
  const resolution = resolveFolderEntry(
    manifestOf(
      entry(`${FOLDER}/README`),
      entry(`${FOLDER}/index`),
      entry(FOLDER),
    ),
    FOLDER,
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["readme", "index", "folder"]);
});

test("resolves root readme and index as candidates", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry("README"), entry("index")),
    "",
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["readme", "index"]);
});

test("normalizes leading and trailing slashes", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`)),
    `/${FOLDER}/`,
  );

  assert.equal(resolution.type, "resolved");
  assert.equal(
    resolution.type === "resolved" && resolution.entry.slug,
    `${FOLDER}/README`,
  );
});

test("excludes entries outside the scope from resolution", () => {
  const manifest = manifestOf(
    entry(`${FOLDER}/README`, "draft"),
    entry(`${FOLDER}/index`),
  );
  const resolution = resolveFolderEntry(manifest, FOLDER);

  assert.equal(resolution.type, "resolved");
  assert.equal(resolution.type === "resolved" && resolution.kind, "index");
  assert.equal(
    resolution.type === "resolved" && resolution.entry,
    manifest.bySlug.get(`${FOLDER}/index`),
  );
});

test("all scope exposes a readme and index conflict regardless of publishing", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`, "draft"), entry(`${FOLDER}/index`)),
    FOLDER,
    { scope: "all" },
  );

  assert.equal(resolution.type, "ambiguous");
  assert.deepEqual(candidateKinds(resolution), ["readme", "index"]);
});

test("discoverable scope rejects unlisted entries", () => {
  const manifest = manifestOf(
    entry(`${FOLDER}/README`, "unlisted"),
    entry(`${FOLDER}/index`),
  );
  const resolution = resolveFolderEntry(manifest, FOLDER, {
    scope: "discoverable",
  });

  assert.equal(resolution.type, "resolved");
  assert.equal(resolution.type === "resolved" && resolution.kind, "index");
  assert.equal(
    resolution.type === "resolved" && resolution.entry,
    manifest.bySlug.get(`${FOLDER}/index`),
  );
});

test("routable scope accepts unlisted entries and rejects drafts", () => {
  const unlisted = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`, "unlisted")),
    FOLDER,
  );
  const draft = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`, "draft")),
    FOLDER,
  );

  assert.equal(unlisted.type, "resolved");
  assert.deepEqual(draft, { type: "none" });
});

test("draft entries never enter the default resolution", () => {
  const resolution = resolveFolderEntry(
    manifestOf(
      entry(`${FOLDER}/README`, "draft"),
      entry(`${FOLDER}/index`, "draft"),
    ),
    FOLDER,
  );

  assert.deepEqual(resolution, { type: "none" });
});

test("scheduled entries are treated as unpublished until their publish time", () => {
  const resolution = resolveFolderEntry(
    manifestOf(entry(`${FOLDER}/README`, "scheduled")),
    FOLDER,
  );

  assert.deepEqual(resolution, { type: "none" });
});

test("resolves a markdown folder owner without treating folder.md as an owner", () => {
  const readme = entry(`${FOLDER}/README`);
  const resolution = resolveFolderLocation(
    manifestOf(readme, entry(FOLDER)),
    FOLDER,
  );

  assert.deepEqual(resolution, { type: "content", entry: readme });
});

test("resolves registered generated locations and preserves ambiguous owners", () => {
  const generated = manifestOf(entry("docs/guide/page"));
  generated.folderLocations.set("/handbook/", {
    pathname: "/handbook/",
    folder: FOLDER,
  });
  assert.deepEqual(resolveFolderLocation(generated, FOLDER), {
    type: "generated",
    pathname: "/handbook/",
  });

  const ambiguous = resolveFolderLocation(
    manifestOf(entry(`${FOLDER}/README`), entry(`${FOLDER}/index`)),
    FOLDER,
  );
  assert.equal(ambiguous.type, "ambiguous");
});

test("derives a generated folder location only when public descendants agree", () => {
  const standard = manifestOf(entry("docs/guide/a"), entry("docs/guide/b"));
  assert.equal(
    resolveGeneratedFolderLocation(standard, "docs/guide"),
    "/docs/guide/",
  );

  const localized = manifestOf(
    {
      ...entry("docs/guide/a.en"),
      permalink: "/en/docs/guide/a",
      publicLocation: {
        slug: "docs/guide/a.en",
        permalink: "/en/docs/guide/a",
        language: "en",
      },
    },
    {
      ...entry("docs/guide/b.en"),
      permalink: "/en/docs/guide/b",
      publicLocation: {
        slug: "docs/guide/b.en",
        permalink: "/en/docs/guide/b",
        language: "en",
      },
    },
  );
  assert.equal(
    resolveGeneratedFolderLocation(localized, "docs/guide", "en"),
    "/en/docs/guide/",
  );

  const ambiguous = manifestOf(
    {
      ...entry("docs/foo/a"),
      permalink: "/articles/a",
      publicLocation: { slug: "docs/foo/a", permalink: "/articles/a" },
    },
    {
      ...entry("docs/foo/b"),
      permalink: "/notes/b",
      publicLocation: { slug: "docs/foo/b", permalink: "/notes/b" },
    },
  );
  assert.equal(resolveGeneratedFolderLocation(ambiguous, "docs/foo"), null);
});

function candidateKinds(
  resolution: ReturnType<typeof resolveFolderEntry>,
): string[] {
  return resolution.type === "ambiguous"
    ? resolution.candidates.map((candidate) => candidate.kind)
    : [];
}

function entry(
  slug: string,
  visibility: PublishingVisibility = "public",
): ContentManifestEntry {
  const routable = visibility === "public" || visibility === "unlisted";
  const discoverable = visibility === "public";
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}` },
    title: slug,
    aliases: [],
    frontmatter: {},
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
    publicEntries: entries.filter((item) => item.publishing.routable),
    discoverableEntries: entries.filter((item) => item.publishing.discoverable),
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    byContentId: new Map(),
    byAlias: new Map(),
    byPermalink: new Map(entries.map((item) => [item.permalink, item])),
    byRoutablePermalink: new Map(
      entries
        .filter((item) => item.publishing.routable)
        .map((item) => [item.permalink, item]),
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
