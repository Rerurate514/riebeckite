import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { definePlugin } from "../src/types/plugin.js";

function source(): ContentSource {
  return {
    async scan() {
      return [{ path: "index.md" }];
    },
    async read() {
      return "---\npublish: true\n---\n# Home";
    },
  };
}

test("plugins resolve framework-independent pages and declare SSG paths", async () => {
  const plugin = definePlugin({
    name: "example-pages",
    pageTypes: [
      {
        id: "example",
        paths: ["/example"],
        resolve: ({ pathname, manifest }) =>
          pathname === "/example"
            ? {
                type: "ignored-by-registry",
                pathname,
                title: "Example",
                body: `<p>${manifest.publicEntries.length}</p>`,
              }
            : null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  assert.deepEqual(await manager.getPagePaths(), ["/example"]);
  assert.deepEqual(await manager.resolvePage("/example/"), {
    type: "example",
    pluginName: "example-pages",
    pathname: "/example",
    title: "Example",
    body: "<p>1</p>",
  });
});

test("same-priority page matches fail rather than silently choosing a plugin", async () => {
  const page = (name: string) =>
    definePlugin({
      name,
      pageTypes: [
        {
          id: `${name}-page`,
          resolve: ({ pathname }) =>
            pathname === "/same"
              ? { type: "unused", pathname, body: "" }
              : null,
        },
      ],
    });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [page("first"), page("second")],
    }),
  });

  await assert.rejects(
    manager.resolvePage("/same"),
    /Multiple plugin page types/,
  );
});

test("duplicate page type IDs fail during plugin resolution", async () => {
  const plugin = (name: string) =>
    definePlugin({
      name,
      pageTypes: [{ id: "duplicate", resolve: () => null }],
    });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [plugin("first"), plugin("second")],
    }),
  });

  await assert.rejects(
    manager.getManifest(),
    /provided by both first and second/,
  );
});

test("page types validate their runtime contract", async () => {
  const plugin = {
    name: "invalid-pages",
    pageTypes: [{ id: "", resolve: null }],
  } as unknown as ReturnType<typeof definePlugin>;
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  await assert.rejects(manager.getManifest(), /id must be a non-empty string/);
});

test("page types can derive SSG paths from the public manifest", async () => {
  const plugin = definePlugin({
    name: "dynamic-pages",
    pageTypes: [
      {
        id: "dynamic",
        paths: ({ manifest }) =>
          manifest.publicEntries.map((entry) => `/preview/${entry.slug}`),
        resolve: () => null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  assert.deepEqual(await manager.getPagePaths(), ["/preview/index"]);
});
