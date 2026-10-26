import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  ContentManager,
  NoopLogger,
  resolveConfig,
  SinkTracer,
} from "@riebeckite/core";
import { canvas } from "../index.js";

function canvasJson(
  text = "Hello [[notes/Public]] and [[notes/Hidden]]",
): string {
  return JSON.stringify({
    nodes: [
      { id: "a", type: "text", x: 0, y: 0, width: 200, height: 100, text },
      {
        id: "b",
        type: "file",
        x: 300,
        y: 0,
        width: 200,
        height: 100,
        file: "notes/Public.md",
      },
      {
        id: "c",
        type: "file",
        x: 600,
        y: 0,
        width: 200,
        height: 100,
        file: "notes/Hidden.md",
      },
    ],
    edges: [{ id: "e", fromNode: "a", toNode: "b" }],
  });
}

const files = {
  "index.md": "---\npublish: true\n---\n\n![[drawings/Architecture.canvas]]\n",
  "drawings/Architecture.canvas": canvasJson(),
  "notes/Public.md": "---\npublish: true\n---\n\n# Public\n",
  "notes/Hidden.md": "---\npublish: false\n---\n\n# Hidden\n",
};

function memorySource(input: Readonly<Record<string, string>>): ContentSource {
  return {
    async scan() {
      return Object.keys(input).map((entryPath) => ({ path: entryPath }));
    },
    async read(entry) {
      return input[entry.path] ?? "";
    },
  };
}

function createManager(
  input: Readonly<Record<string, string>>,
  options: Parameters<typeof canvas>[0] = {},
) {
  return new ContentManager(memorySource(input), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [canvas(options)],
    }),
  });
}

test("canvas document pages are disabled by default", async () => {
  const manager = createManager(files);
  assert.deepEqual([...(await manager.getPagePaths())], []);
  assert.equal(await manager.resolvePage("/drawings/Architecture"), null);
});

test("documentPages declares a page with the .canvas extension removed", async () => {
  const manager = createManager(files, { documentPages: true });
  assert.deepEqual([...(await manager.getPagePaths())].sort(), [
    "/drawings/Architecture",
  ]);
});

test("resolve renders the canvas with main, h1, stage, and payload", async () => {
  const manager = createManager(files, { documentPages: true });
  const page = await manager.resolvePage("/drawings/Architecture");

  assert.equal(page?.type, "canvas-document");
  assert.equal(page?.pluginName, "canvas");
  assert.equal(page?.pathname, "/drawings/Architecture");
  assert.equal(page?.title, "Architecture");

  const body = page?.body ?? "";
  assert.match(body, /<main class="rb-canvas-page">/);
  assert.match(body, /<h1 class="rb-canvas-page__title">Architecture<\/h1>/);
  assert.match(body, /class="rb-canvas"/);
  assert.match(body, /data-canvas-render="both"/);
  assert.match(body, /data-canvas-stage/);
  assert.match(body, /data-canvas-payload/);
  assert.match(body, /data-canvas-node-id="a"/);
});

test("canvas page note links resolve public notes and neutralize private ones", async () => {
  const manager = createManager(files, { documentPages: true });
  const body =
    (await manager.resolvePage("/drawings/Architecture"))?.body ?? "";

  assert.match(body, /data-canvas-note="notes%2FPublic"/);
  assert.match(body, /href="\/notes\/Public"/);
  assert.match(body, /data-canvas-note="notes%2FHidden"/);
  assert.match(body, /href="#"/);
  assert.doesNotMatch(body, /href="\/notes\/Hidden"/);
});

test("invalid canvas JSON declares no page and reports a diagnostic", async () => {
  const manager = createManager(
    { ...files, "drawings/Architecture.canvas": "{ not valid json" },
    { documentPages: true },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "canvas-invalid"),
    true,
  );
});

test("Markdown wins when a canvas page path collides with a note", async () => {
  const manager = createManager(
    {
      ...files,
      "drawings/Architecture.md": "---\npublish: true\n---\n\n# Note\n",
    },
    { documentPages: true },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
  assert.equal(await manager.resolvePage("/drawings/Architecture"), null);

  const manifest = await manager.getManifest();
  assert.equal(
    manifest.byRoutablePermalink.has("/drawings/Architecture"),
    true,
  );
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "canvas-page-conflict"),
    true,
  );
});

test("a canvas referenced only by a non-public note is not published", async () => {
  const manager = createManager(
    {
      "draft.md":
        "---\npublish: false\n---\n\n![[drawings/Architecture.canvas]]\n",
      "drawings/Architecture.canvas": canvasJson(),
    },
    { documentPages: true },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
});

test("a missing canvas file declares no page", async () => {
  const manager = createManager(
    {
      "index.md":
        "---\npublish: true\n---\n\n![[drawings/Architecture.canvas]]\n",
    },
    { documentPages: true },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
});

test("canvas pages stay consistent across cold and warm builds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-canvas-"),
  );

  const first = await buildCached(files, { documentPages: true }, directory);
  assert.deepEqual([...(await first.manager.getPagePaths())].sort(), [
    "/drawings/Architecture",
  ]);
  const firstBody = (await first.manager.resolvePage("/drawings/Architecture"))
    ?.body;
  await first.manager.dispose();

  const second = await buildCached(files, { documentPages: true }, directory);
  assert.deepEqual([...(await second.manager.getPagePaths())].sort(), [
    "/drawings/Architecture",
  ]);
  const secondBody = (
    await second.manager.resolvePage("/drawings/Architecture")
  )?.body;
  assert.equal(firstBody, secondBody);
  await second.manager.dispose();

  const extended = {
    ...files,
    "extra.md": "---\npublish: true\n---\n\n![[extra/Diagram.canvas]]\n",
    "extra/Diagram.canvas": canvasJson("Updated content"),
  };
  const third = await buildCached(extended, { documentPages: true }, directory);
  assert.deepEqual([...(await third.manager.getPagePaths())].sort(), [
    "/drawings/Architecture",
    "/extra/Diagram",
  ]);
  const thirdBody = (await third.manager.resolvePage("/extra/Diagram"))?.body;
  assert.match(thirdBody ?? "", /Updated content/);
  await third.manager.dispose();

  const removed = { ...extended };
  delete (removed as Record<string, string>)["extra/Diagram.canvas"];
  const fourth = await buildCached(removed, { documentPages: true }, directory);
  assert.deepEqual([...(await fourth.manager.getPagePaths())].sort(), [
    "/drawings/Architecture",
  ]);
  await fourth.manager.dispose();
});

async function buildCached(
  input: Readonly<Record<string, string>>,
  options: Parameters<typeof canvas>[0],
  directory: string,
) {
  const plugin = canvas(options);
  const config: ResolvedRiebeckiteConfig = {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins: [plugin],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
  const manager = new ContentManager(memorySource(input), [], {
    config,
    plugins: config.plugins,
    observability: {
      logger: new NoopLogger(),
      tracer: new SinkTracer({ onEvent: () => {}, onSpan: () => {} }),
    },
  });
  await manager.build({ incremental: true });
  return { manager };
}
