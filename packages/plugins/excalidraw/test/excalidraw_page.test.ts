import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentSource } from "@riebeckite/core";
import { ContentManager, resolveConfig } from "@riebeckite/core";
import { excalidraw } from "../index.ts";

const DRAWING = JSON.stringify({
  type: "excalidraw",
  version: 2,
  elements: [],
  appState: {},
});

function drawingMarkdown(): string {
  return `---\npublish: true\nexcalidraw-plugin: parsed\n---\n\n## Drawing\n\`\`\`json\n${DRAWING}\n\`\`\`\n`;
}

function source(): ContentSource {
  const files: Record<string, string> = {
    "index.md": "---\npublish: true\n---\n# Home",
    "drawing.excalidraw.md": drawingMarkdown(),
    "note.md": drawingMarkdown(),
    "plain.md": "---\npublish: true\n---\n# Plain",
  };
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function createManager() {
  return new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [excalidraw()] }),
  });
}

test("excalidraw documents declare SSG page paths from the manifest", async () => {
  const manager = createManager();

  assert.deepEqual([...(await manager.getPagePaths())].sort(), [
    "/drawing",
    "/note",
  ]);
});

test("excalidraw page routes record their source content", async () => {
  const manager = createManager();
  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.pageRoutes.map((route) => ({
      pathname: route.pathname,
      sourceSlugs: route.sourceSlugs,
    })),
    [
      { pathname: "/drawing", sourceSlugs: ["drawing.excalidraw"] },
      { pathname: "/note", sourceSlugs: ["note"] },
    ],
  );
});

test("excalidraw documents resolve to a plugin page", async () => {
  const manager = createManager();

  const page = await manager.resolvePage("/note");
  assert.equal(page?.type, "excalidraw-document");
  assert.equal(page?.pluginName, "excalidraw");
  assert.equal(page?.pathname, "/note");
  assert.equal(page?.title, "note");
  assert.match(page?.body ?? "", /class="rr-excalidraw-page"/);
  assert.match(page?.body ?? "", /class="rr-excalidraw__payload"/);
});

test("a .excalidraw.md permalink is stripped of its extension", async () => {
  const manager = createManager();

  const page = await manager.resolvePage("/drawing");
  assert.equal(page?.type, "excalidraw-document");
  assert.equal(page?.title, "drawing");
  assert.match(page?.body ?? "", /class="rr-excalidraw__canvas"/);
});

test("plain markdown is not claimed as an excalidraw page", async () => {
  const manager = createManager();

  assert.equal(await manager.resolvePage("/plain"), null);
});
