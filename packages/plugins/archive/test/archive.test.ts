import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentCollection,
  ContentManager,
  type ContentManifestEntry,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import {
  archive,
  archivePaginationLabels,
  archivePlugin,
  formatArchivePeriod,
  renderArchivePage,
  resolveArchiveOptions,
} from "../index.ts";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function archiveConfig(locale = "en") {
  return resolveConfig({
    site: { title: "Test", locale },
    content: { filters: { publishStrategy: "explicit" } },
  });
}

const monthlyFiles = {
  "a.md": "---\npublish: true\ntitle: Alpha\ndate: 2025-01-15\n---\n# Alpha",
  "b.md": "---\npublish: true\ntitle: Beta\ndate: 2025-01-10\n---\n# Beta",
  "c.md": "---\npublish: true\ntitle: Gamma\ndate: 2025-01-05\n---\n# Gamma",
  "d.md": "---\npublish: true\ntitle: Delta\ndate: 2024-12-20\n---\n# Delta",
};

test("archive() is re-exported as archivePlugin and declares no assets", () => {
  assert.equal(archivePlugin, archive);
  assert.equal(archive().assets, undefined);
  assert.deepEqual(archive().outputDependencies, undefined);
});

test("resolveArchiveOptions applies defaults and overrides", () => {
  assert.deepEqual(resolveArchiveOptions(), {
    basePath: "/archive",
    pageSize: 10,
    locale: null,
    className: "rb-archive",
  });
  assert.deepEqual(
    resolveArchiveOptions({
      basePath: "history/",
      pageSize: 0,
      locale: "ja",
      className: " custom ",
    }),
    {
      basePath: "/history",
      pageSize: 0,
      locale: "ja",
      className: "custom",
    },
  );
});

test("formatArchivePeriod and archivePaginationLabels follow the locale", () => {
  assert.equal(formatArchivePeriod("2025-01", "en"), "January 2025");
  assert.equal(formatArchivePeriod("2025-01", "ja"), "2025年1月");
  assert.equal(formatArchivePeriod("2025", "en"), "2025");
  assert.equal(formatArchivePeriod("not-a-date", "en"), "not-a-date");
  assert.deepEqual(archivePaginationLabels("ja"), {
    previous: "前のページ",
    next: "次のページ",
  });
  assert.deepEqual(archivePaginationLabels("en"), {
    previous: "Previous",
    next: "Next",
  });
});

test("renderArchivePage escapes titles, links, and pagination", () => {
  const collection: ContentCollection = {
    kind: "archive",
    value: "2025-01",
    title: 'A <b>"x"',
    path: "/archive/2025/01",
    page: {
      current: 2,
      count: 2,
      size: 1,
      total: 2,
      previousPath: "/archive/2025/01",
      nextPath: null,
    },
    entries: [
      {
        permalink: "/p?a=1&b=2",
        title: "T <x>",
      } as ContentManifestEntry,
    ],
  };

  const page = renderArchivePage(collection, resolveArchiveOptions(), "en");

  assert.equal(page.title, 'A <b>"x"');
  assert.match(page.html, /href="\/p\?a=1&amp;b=2"/);
  assert.match(page.html, /T &lt;x&gt;/);
  assert.match(
    page.html,
    /rel="prev"[^>]*href="\/archive\/2025\/01"[^>]*>Previous</,
  );
});

test("generates monthly archive pages with pagination", async () => {
  const content = new ContentManager(source(monthlyFiles), [], {
    config: archiveConfig("en"),
    plugins: [archive({ pageSize: 2 })],
  });

  assert.deepEqual(await content.getPagePaths(), [
    "/archive/2025/01",
    "/archive/2025/01/page/2",
    "/archive/2024/12",
  ]);

  const january = await content.resolvePage("/archive/2025/01");
  assert.equal(january?.type, "archive");
  assert.equal(january?.title, "January 2025");
  assert.match(january?.body ?? "", /href="\/a"/);
  assert.match(january?.body ?? "", /href="\/b"/);
  assert.match(
    january?.body ?? "",
    /rel="next"[^>]*href="\/archive\/2025\/01\/page\/2"/,
  );

  const januaryPage2 = await content.resolvePage("/archive/2025/01/page/2");
  assert.match(januaryPage2?.body ?? "", /href="\/c"/);
  assert.match(
    januaryPage2?.body ?? "",
    /rel="prev"[^>]*href="\/archive\/2025\/01"/,
  );

  const december = await content.resolvePage("/archive/2024/12");
  assert.equal(december?.title, "December 2024");
});

test("renders the archive period and pagination labels in Japanese", async () => {
  const content = new ContentManager(source(monthlyFiles), [], {
    config: archiveConfig("ja"),
    plugins: [archive({ pageSize: 2 })],
  });

  const january = await content.resolvePage("/archive/2025/01");
  assert.equal(january?.title, "2025年1月");
  assert.match(january?.body ?? "", />次のページ</);
});

test("archive pages exclude entries that are not discoverable", async () => {
  const content = new ContentManager(
    source({
      "shown.md":
        "---\npublish: true\ntitle: Shown\ndate: 2025-02-01\n---\n# Shown",
      "hidden.md": "---\ntitle: Hidden\ndate: 2025-02-02\n---\n# Hidden",
      "unlisted.md":
        "---\npublish: true\nvisibility: unlisted\ntitle: Unlisted\ndate: 2025-02-03\n---\n# Unlisted",
    }),
    [],
    { config: archiveConfig("en"), plugins: [archive()] },
  );

  assert.deepEqual(await content.getPagePaths(), ["/archive/2025/02"]);

  const page = await content.resolvePage("/archive/2025/02");
  assert.match(page?.body ?? "", /href="\/shown"/);
  assert.doesNotMatch(page?.body ?? "", /hidden/);
  assert.doesNotMatch(page?.body ?? "", /unlisted/);
});

test("archive pages honor a custom base path", async () => {
  const content = new ContentManager(source(monthlyFiles), [], {
    config: archiveConfig("en"),
    plugins: [archive({ basePath: "/history" })],
  });

  assert.deepEqual(await content.getPagePaths(), [
    "/history/2025/01",
    "/history/2024/12",
  ]);
  assert.equal(await content.resolvePage("/archive/2025/01"), null);
  assert.equal(
    (await content.resolvePage("/history/2025/01"))?.type,
    "archive",
  );
});

test("an empty base path disables the archive pages", async () => {
  const content = new ContentManager(source(monthlyFiles), [], {
    config: archiveConfig("en"),
    plugins: [archive({ basePath: "" })],
  });

  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/archive/2025/01"), null);
});

test("archive routes exist only when the plugin is enabled", async () => {
  const content = new ContentManager(source(monthlyFiles), [], {
    config: archiveConfig("en"),
    plugins: [],
  });

  assert.deepEqual(await content.getPagePaths(), []);
  assert.equal(await content.resolvePage("/archive/2025/01"), null);
});

test("archive pages coexist with content routes and win the plugin match", async () => {
  const content = new ContentManager(
    source({
      ...monthlyFiles,
      "archive/2025/01.md":
        "---\npublish: true\ntitle: Manual\ndate: 2025-01-01\n---\n# Manual",
    }),
    [],
    { config: archiveConfig("en"), plugins: [archive({ pageSize: 10 })] },
  );

  const page = await content.resolvePage("/archive/2025/01");
  assert.equal(page?.type, "archive");
  assert.equal(await content.resolvePage("/a"), null);
});
