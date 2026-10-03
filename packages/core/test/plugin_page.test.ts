import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { definePlugin, resolvePlugins } from "../src/types/plugin.js";

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

test("records distinct directory-index page routes while runtime priority selects one", async () => {
  const page = (name: string, priority: number, path: string) =>
    definePlugin({
      name,
      pageTypes: [
        {
          id: `${name}-page`,
          directoryIndex: true,
          priority,
          paths: [path],
          resolve: ({ pathname }) =>
            pathname === "/foo/"
              ? { type: "unused", pathname, body: "" }
              : null,
        },
      ],
    });
  const observed: string[] = [];
  const observer = definePlugin({
    name: "observer",
    onManifestCreated: ({ manifest }) => {
      observed.push(...manifest.pageRoutes.map((route) => route.pluginName));
    },
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [page("low", 0, "/foo"), page("high", 1, "/foo/"), observer],
    }),
  });

  await manager.getManifest();

  assert.deepEqual(observed, ["low", "high"]);
  assert.equal((await manager.resolvePage("/foo"))?.pluginName, "high");
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

test("config-driven duplicate plugin names fail during config resolution", () => {
  const plugin = () => definePlugin({ name: "duplicate-name" });

  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Test" },
        plugins: [plugin(), plugin()],
      }),
    /Duplicate plugin name "duplicate-name"/,
  );
});

test("direct resolvePlugins callers reject duplicate plugin names", () => {
  const plugin = () => definePlugin({ name: "duplicate-name" });

  assert.throws(
    () => resolvePlugins([plugin(), plugin()]),
    /Plugin name "duplicate-name" is used by both/,
  );
});

test("disabled plugins may reuse a name without colliding", async () => {
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [
        definePlugin({ name: "shared", enabled: false }),
        definePlugin({ name: "shared" }),
      ],
    }),
  });

  const manifest = await manager.getManifest();
  assert.equal(manifest.entries.length, 1);
});

test("the resolved plugin set is reused across hook invocations", async () => {
  const seen: string[] = [];
  const observer = definePlugin({
    name: "observer",
    onManifestCreated: () => {
      seen.push("manifest");
    },
    buildEnd: () => {
      seen.push("buildEnd");
    },
    addDiagnostics: () => [],
  });
  const plugins: ReturnType<typeof definePlugin>[] = [observer];
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins }),
  });

  await manager.getManifest();
  assert.deepEqual(seen, ["manifest", "buildEnd"]);

  plugins.push(definePlugin({ name: "late" }));
  await manager.getPagePaths();
  await manager.getManifest();

  assert.deepEqual(seen, ["manifest", "buildEnd"]);
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

test("normal page types keep stripped paths and html outputs", async () => {
  const plugin = definePlugin({
    name: "normal-pages",
    pageTypes: [
      {
        id: "normal",
        paths: ["/folder"],
        resolve: () => null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  assert.deepEqual(await manager.getPagePaths(), ["/folder"]);
  const pageOutputs = (
    await manager.getOutputChangeSet({
      incremental: false,
    })
  ).affected.filter((output) => output.kind === "plugin-page");
  assert.deepEqual(
    pageOutputs.map((output) => output.path),
    ["folder.html"],
  );
});

test("directory-index page types resolve and emit trailing-slash index routes", async () => {
  const plugin = definePlugin({
    name: "folder-pages",
    pageTypes: [
      {
        id: "folder-index",
        directoryIndex: true,
        paths: ["/docs/getting-started"],
        resolve: ({ pathname }) =>
          pathname === "/docs/getting-started/"
            ? { type: "unused", pathname, body: "folder" }
            : null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });
  const expected = {
    type: "folder-index",
    pluginName: "folder-pages",
    pathname: "/docs/getting-started/",
    body: "folder",
  };

  assert.deepEqual(await manager.getPagePaths(), ["/docs/getting-started/"]);
  assert.deepEqual(
    await manager.resolvePage("/docs/getting-started/"),
    expected,
  );
  assert.deepEqual(
    await manager.resolvePage("/docs/getting-started"),
    expected,
  );

  const pageOutputs = (
    await manager.getOutputChangeSet({
      incremental: false,
    })
  ).affected.filter((output) => output.kind === "plugin-page");
  assert.deepEqual(
    pageOutputs.map((output) => output.path),
    ["docs/getting-started/index.html"],
  );
});

test("directory-index page type output carries its declared dependencies", async () => {
  const plugin = definePlugin({
    name: "folder-pages",
    pageTypes: [
      {
        id: "folder-index",
        directoryIndex: true,
        paths: ["/folder"],
        outputDependencies: [{ type: "folder", folder: "folder" }],
        resolve: () => null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });
  const pageOutputs = (
    await manager.getOutputChangeSet({ incremental: false })
  ).affected.filter((output) => output.kind === "plugin-page");

  assert.deepEqual(
    pageOutputs.map((output) => output.path),
    ["folder/index.html"],
  );
  assert.deepEqual(pageOutputs[0]?.dependencies, [
    { type: "folder", folder: "folder" },
  ]);
});

test("a normal and a directory-index page type on the same route conflict", async () => {
  const normal = definePlugin({
    name: "normal-pages",
    pageTypes: [
      {
        id: "normal",
        resolve: ({ pathname }) =>
          pathname === "/folder"
            ? { type: "unused", pathname, body: "" }
            : null,
      },
    ],
  });
  const directory = definePlugin({
    name: "folder-pages",
    pageTypes: [
      {
        id: "folder-index",
        directoryIndex: true,
        resolve: ({ pathname }) =>
          pathname === "/folder/"
            ? { type: "unused", pathname, body: "" }
            : null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [normal, directory],
    }),
  });

  await assert.rejects(
    manager.resolvePage("/folder"),
    /Multiple plugin page types/,
  );
});

test("directory-index page types validate the directoryIndex flag", async () => {
  const plugin = {
    name: "invalid-pages",
    pageTypes: [{ id: "invalid", directoryIndex: "yes", resolve: () => null }],
  } as unknown as ReturnType<typeof definePlugin>;
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  await assert.rejects(
    manager.getManifest(),
    /directoryIndex must be a boolean/,
  );
});
