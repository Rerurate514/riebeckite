import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { createInvalid } from "../src/testing/fixtures.js";
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

test("development requests resolve route metadata without processing every post", async () => {
  let processed = 0;
  const plugin = definePlugin({
    name: "route-page",
    extendMarkdownPipeline: () => {
      processed += 1;
    },
    pageTypes: [
      {
        id: "route-page",
        resolve: () => null,
        resolveRoute: () => null,
      },
    ],
  });
  const manager = new ContentManager(
    {
      async scan() {
        return [{ path: "index.md" }, { path: "other.md" }];
      },
      async read(entry) {
        return entry.path === "index.md"
          ? "---\npublish: true\n---\n# Home\n\n[[other]]"
          : "---\npublish: true\n---\n# Other";
      },
    },
    [],
    {
      config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
      isDevelopment: true,
    },
  );

  const [first, second] = await Promise.all([
    manager.getRequestManifest(),
    manager.getRequestManifest(),
  ]);

  assert.equal(first, second);
  assert.equal(first.bySlug.get("index")?.html, "");
  assert.deepEqual(first.bySlug.get("other")?.backlinks, ["index"]);
  assert.equal(await manager.resolvePage("/other"), null);
  assert.equal(processed, 0);
  await manager.getProcessedContent("other");
  assert.equal(processed, 1);
});

test("development route manifests restore a verified persistent cache", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-route-cache-"),
  );
  let locationCalls = 0;
  let restoreCalls = 0;
  const plugin = () =>
    definePlugin({
      name: "route-cache",
      developmentRouteCache: {
        version: "v1",
        serialize: () => ({ ready: true }),
        restore: () => {
          restoreCalls += 1;
        },
      },
      extendContentLocations: () => {
        locationCalls += 1;
      },
    });
  const options = {
    config: resolveConfig({
      content: { directory },
      site: { title: "Test" },
      plugins: [plugin()],
    }),
    isDevelopment: true,
  };
  try {
    await new ContentManager(source(), [], options).getRequestManifest();
    const second = new ContentManager(source(), [], {
      ...options,
      config: resolveConfig({
        content: { directory },
        site: { title: "Test" },
        plugins: [plugin()],
      }),
    });

    assert.equal((await second.getRequestManifest()).entries[0]?.slug, "index");
    assert.equal(locationCalls, 1);
    assert.equal(restoreCalls, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("development route cache misses when source content changes", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-route-cache-"),
  );
  let markdown = "# Home";
  let locationCalls = 0;
  const plugin = () =>
    definePlugin({
      name: "route-cache-change",
      developmentRouteCache: { version: "v1" },
      extendContentLocations: () => {
        locationCalls += 1;
      },
    });
  const content: ContentSource = {
    async scan() {
      return [{ path: "index.md" }];
    },
    async read() {
      return markdown;
    },
  };
  try {
    await new ContentManager(content, [], {
      config: resolveConfig({
        content: { directory },
        site: { title: "Test" },
        plugins: [plugin()],
      }),
      isDevelopment: true,
    }).getRequestManifest();
    markdown = "# Changed";
    await new ContentManager(content, [], {
      config: resolveConfig({
        content: { directory },
        site: { title: "Test" },
        plugins: [plugin()],
      }),
      isDevelopment: true,
    }).getRequestManifest();

    assert.equal(locationCalls, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("development route cache bounds fingerprint reads", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-route-cache-"),
  );
  const entries = Array.from({ length: 64 }, (_, index) => ({
    path: `post-${index}.md`,
  }));
  let activeReads = 0;
  let maxActiveReads = 0;
  const content: ContentSource = {
    async scan() {
      return entries;
    },
    async read(entry) {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeReads -= 1;
      return `# ${entry.path}`;
    },
  };
  const options = () => ({
    config: resolveConfig({
      content: { directory },
      site: { title: "Test" },
      plugins: [
        definePlugin({
          name: "route-cache-concurrency",
          developmentRouteCache: { version: "v1" },
        }),
      ],
    }),
    isDevelopment: true,
  });
  try {
    await new ContentManager(content, [], options()).getRequestManifest();
    activeReads = 0;
    maxActiveReads = 0;
    await new ContentManager(content, [], options()).getRequestManifest();

    assert.ok(maxActiveReads <= 16);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("corrupted development route cache falls back to route resolution", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-route-cache-"),
  );
  let locationCalls = 0;
  const plugin = () =>
    definePlugin({
      name: "route-cache-corruption",
      developmentRouteCache: { version: "v1" },
      extendContentLocations: () => {
        locationCalls += 1;
      },
    });
  const options = () => ({
    config: resolveConfig({
      content: { directory },
      site: { title: "Test" },
      plugins: [plugin()],
    }),
    isDevelopment: true,
  });
  try {
    await new ContentManager(source(), [], options()).getRequestManifest();
    await fs.writeFile(
      path.join(directory, ".riebeckite", "development-route-state.json"),
      "{}",
    );
    await new ContentManager(source(), [], options()).getRequestManifest();

    assert.equal(locationCalls, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("development routing falls back to the full manifest for unopted page types", async () => {
  let manifestCalls = 0;
  const plugin = definePlugin({
    name: "legacy-page",
    onManifestCreated: () => {
      manifestCalls += 1;
    },
    pageTypes: [
      {
        id: "legacy",
        resolve: ({ pathname }) =>
          pathname === "/legacy"
            ? { type: "legacy", pathname, body: "legacy" }
            : null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  assert.equal((await manager.resolvePage("/legacy"))?.body, "legacy");
  assert.equal(manifestCalls, 1);
});

test("development route manifests run opted manifest hooks without article HTML", async () => {
  const plugin = definePlugin({
    name: "route-metadata",
    developmentRouteManifest: true,
    onManifestCreated: ({ manifest }) => {
      const entry = manifest.entries[0];
      if (entry)
        entry.headTags = [
          ...(entry.headTags ?? []),
          { tag: "meta", attrs: { name: "robots", content: "index" } },
        ];
    },
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  const manifest = await manager.getRequestManifest();

  assert.equal(manifest.entries[0]?.html, "");
  assert.deepEqual(manifest.entries[0]?.headTags, [
    { tag: "meta", attrs: { name: "robots", content: "index" } },
  ]);
});

test("development route manifests defer unopted manifest hooks", async () => {
  const plugin = definePlugin({
    name: "legacy-metadata",
    onManifestCreated: ({ manifest }) => {
      const entry = manifest.entries[0];
      if (entry)
        entry.headTags = [
          ...(entry.headTags ?? []),
          { tag: "meta", attrs: { name: "robots", content: "noindex" } },
        ];
    },
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  const manifest = await manager.getRequestManifest();

  assert.equal(manifest.entries[0]?.html, "");
  assert.deepEqual(manifest.entries[0]?.headTags, undefined);
  const fullManifest = await manager.getManifest();
  assert.match(fullManifest.entries[0]?.html ?? "", /<h1[^>]*>Home<\/h1>/);
  assert.deepEqual(fullManifest.entries[0]?.headTags, [
    { tag: "meta", attrs: { name: "robots", content: "noindex" } },
  ]);
});

test("development routing defers unrelated manifest hooks for route-aware pages", async () => {
  let manifestCalls = 0;
  const plugin = definePlugin({
    name: "route-page",
    onManifestCreated: () => {
      manifestCalls += 1;
    },
    pageTypes: [
      {
        id: "route-page",
        resolve: ({ pathname }) =>
          pathname === "/route"
            ? { type: "route-page", pathname, body: "full" }
            : null,
        resolveRoute: ({ pathname }) =>
          pathname === "/route"
            ? { type: "route-page", pathname, body: "route" }
            : null,
      },
    ],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  assert.equal((await manager.resolvePage("/route"))?.body, "route");
  assert.equal(manifestCalls, 0);
});

test("development route manifests retain localization", async () => {
  const plugin = definePlugin({
    name: "localization",
    resolveContentLocalization: () => ({
      defaultLocale: "en",
      locales: ["en", "ja"],
    }),
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  assert.deepEqual((await manager.getRequestManifest()).localization, {
    defaultLocale: "en",
    locales: ["en", "ja"],
  });
});

test("development route manifests share parsed frontmatter with location hooks", async () => {
  const plugin = definePlugin({
    name: "location-frontmatter",
    extendContentLocations: ({ entries }) => {
      if (entries[0]) entries[0].frontmatter = { title: "Shared" };
    },
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
    isDevelopment: true,
  });

  const manifest = await manager.getRequestManifest();

  assert.deepEqual(manifest.entries[0]?.frontmatter, { title: "Shared" });
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

test("declared page paths are evaluated once and outputs follow runtime priority", async () => {
  let declarations = 0;
  const page = (name: string, priority: number) =>
    definePlugin({
      name,
      pageTypes: [
        {
          id: `${name}-page`,
          directoryIndex: true,
          priority,
          paths: () => {
            declarations += 1;
            return ["/foo"];
          },
          outputDependencies: [{ type: "folder", folder: name }],
          resolve: ({ pathname }) =>
            pathname === "/foo/"
              ? { type: "unused", pathname, body: "" }
              : null,
        },
      ],
    });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [page("high", 1), page("low", 0)],
    }),
  });

  const outputs = (
    await manager.getOutputChangeSet({ incremental: false })
  ).affected.filter((output) => output.kind === "plugin-page");

  assert.equal(declarations, 2);
  assert.deepEqual(outputs, [
    {
      kind: "plugin-page",
      path: "foo/index.html",
      producer: "plugin:high:page:high-page",
      dependencies: [{ type: "folder", folder: "high" }],
    },
  ]);
});

test("same-priority declared page paths fail rather than choosing a producer", async () => {
  const page = (name: string) =>
    definePlugin({
      name,
      pageTypes: [
        {
          id: `${name}-page`,
          paths: ["/same"],
          resolve: () => null,
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
    manager.getOutputChangeSet(),
    /Multiple plugin page types declare \/same at priority 0/,
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

test("numeric precedence orders transforms while capabilities order real dependencies", () => {
  const plugins = resolvePlugins([
    definePlugin({ name: "consumer", requires: ["content.index"] }),
    definePlugin({ name: "default" }),
    definePlugin({ name: "provider", provides: ["content.index"] }),
    definePlugin({ name: "early-transform", order: -10 }),
  ]);

  assert.deepEqual(
    plugins.map((plugin) => plugin.name),
    ["early-transform", "default", "provider", "consumer"],
  );
});

test("capability cycles remain errors after numeric precedence is applied", () => {
  assert.throws(
    () =>
      resolvePlugins([
        definePlugin({
          name: "first",
          order: -10,
          provides: ["first"],
          requires: ["second"],
        }),
        definePlugin({
          name: "second",
          provides: ["second"],
          requires: ["first"],
        }),
      ]),
    /Plugin dependency cycle detected/,
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
  const plugin = createInvalid<ReturnType<typeof definePlugin>>({
    name: "invalid-pages",
    pageTypes: [{ id: "", resolve: null }],
  });
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
  const plugin = createInvalid<ReturnType<typeof definePlugin>>({
    name: "invalid-pages",
    pageTypes: [{ id: "invalid", directoryIndex: "yes", resolve: () => null }],
  });
  const manager = new ContentManager(source(), [], {
    config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }),
  });

  await assert.rejects(
    manager.getManifest(),
    /directoryIndex must be a boolean/,
  );
});
