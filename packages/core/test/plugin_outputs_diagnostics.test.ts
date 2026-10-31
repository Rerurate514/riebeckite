import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { assertGoldenJson } from "@riebeckite/test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import {
  type DerivedView,
  defineDerivedView,
} from "../src/derived/derived_view.js";
import { definePlugin } from "../src/types/plugin.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const oneNote = {
  "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
};

test("plugins resolve registered derived views through the runtime context", async () => {
  const summary = defineDerivedView<string, string>({
    id: "official.summary",
    version: "1",
    compute: (value) => value.toUpperCase(),
  });
  let result = "";
  const plugin = definePlugin({
    name: "derived-example",
    derivedViews: [summary],
    async setup(context) {
      result = await context.derived.resolve(summary, "ready");
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [plugin],
  });

  await manager.getManifest();
  assert.equal(result, "READY");
});

test("generated output plans resolve registered derived views", async () => {
  const summary = defineDerivedView<string, string>({
    id: "official.planned-summary",
    version: "1",
    compute: (value, context) => {
      context.track({ type: "file", id: "source.md", fingerprint: "1" });
      return value.toUpperCase();
    },
  });
  const plugin = definePlugin({
    name: "derived-plan-example",
    derivedViews: [summary],
    async planGeneratedOutputs({ derived }) {
      const resolved = await derived.resolveWithDependencies(summary, "ready");
      return [
        {
          path: "derived.txt",
          content: resolved.value,
          derivedDependencies: resolved.dependencies,
        },
      ];
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [plugin],
  });

  const manifest = await manager.getManifest();
  assert.deepEqual(manifest.generatedOutputs, [
    {
      content: "READY",
      dependencies: [{ path: "source.md", type: "file" }],
      owner: "derived-plan-example",
      path: "derived.txt",
    },
  ]);
});

test("manifest collects plugin diagnostics with owner attribution", async () => {
  const checker = definePlugin({
    name: "checker",
    addDiagnostics: () => [
      {
        code: "orphan-note",
        severity: "warning",
        message: "No backlinks",
        slug: "note",
      },
      {
        code: "broken-wikilink",
        severity: "error",
        message: "Missing [[x]]",
        pluginName: "external-rule",
      },
    ],
  });
  const tracker = definePlugin({
    name: "tracker",
    onContentLoaded: ({ diagnostics, slug }) => {
      diagnostics.push({
        code: "missing-frontmatter",
        severity: "info",
        message: `Loaded ${slug}`,
      });
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [checker, tracker],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.diagnostics, [
    {
      code: "missing-frontmatter",
      severity: "info",
      message: "Loaded note",
    },
    {
      code: "orphan-note",
      severity: "warning",
      message: "No backlinks",
      slug: "note",
      pluginName: "checker",
    },
    {
      code: "broken-wikilink",
      severity: "error",
      message: "Missing [[x]]",
      pluginName: "external-rule",
    },
  ]);
  assertGoldenJson(
    manifest.diagnostics,
    new URL("./__golden__/plugin_diagnostics.json", import.meta.url),
  );
});

test("manifest collects generated outputs sorted by path", async () => {
  const emitter = definePlugin({
    name: "emitter",
    buildEnd: ({ output }) => {
      output.emit({ path: "daily/feed.xml", content: "<feed />" });
      output.emit({ path: "_redirects", content: "/a /b 301" });
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [emitter],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => [output.path, output.owner]),
    [
      ["_redirects", "emitter"],
      ["daily/feed.xml", "emitter"],
    ],
  );
  assertGoldenJson(
    manifest.generatedOutputs,
    new URL("./__golden__/generated_outputs.json", import.meta.url),
  );
});

test("two plugins cannot claim the same generated output path", async () => {
  const first = definePlugin({
    name: "first",
    buildEnd: ({ output }) => output.emit({ path: "x.txt", content: "1" }),
  });
  const second = definePlugin({
    name: "second",
    buildEnd: ({ output }) => output.emit({ path: "x.txt", content: "2" }),
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [first, second],
  });

  await assert.rejects(manager.getManifest(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Plugin "second" failed during "buildEnd"/);
    assert.match(causeMessage(error), /Duplicate generated output path/);
    assert.match(causeMessage(error), /declared by "first" and "second"/);
    return true;
  });
});

test("generated output paths are validated when emitted", async () => {
  const unsafe = definePlugin({
    name: "unsafe",
    buildEnd: ({ output }) =>
      output.emit({ path: "../escape.txt", content: "x" }),
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [unsafe],
  });

  await assert.rejects(manager.getManifest(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Plugin "unsafe" failed during "buildEnd"/);
    assert.match(
      causeMessage(error),
      /must not contain "\." or "\.\." segments/,
    );
    return true;
  });
});

test("buildEnd runs all terminal plugin work in resolved order", async () => {
  const seen: string[] = [];
  const first = definePlugin({
    name: "first",
    buildEnd: () => {
      seen.push("first");
    },
  });
  const second = definePlugin({
    name: "second",
    buildEnd: () => {
      seen.push("second");
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [second, first],
  });

  await manager.getManifest();

  assert.deepEqual(seen, ["second", "first"]);
});

test("manifest hook failures retain plugin and hook identity", async () => {
  const broken = definePlugin({
    name: "broken",
    onManifestCreated: () => {
      throw new Error("expected failure");
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [broken],
  });

  await assert.rejects(manager.getManifest(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(
      error.message,
      /Plugin "broken" failed during "onManifestCreated"/,
    );
    assert.match(causeMessage(error), /expected failure/);
    return true;
  });
});

function causeMessage(error: unknown): string {
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error ? cause.message : String(cause);
}

test("manifest collects plugin assets with resolved owners", async () => {
  const assetPlugin = definePlugin({
    name: "asset-plugin",
    assets: [
      { pluginName: "", kind: "style", moduleSpecifier: "@example/theme.css" },
      {
        pluginName: "custom-owner",
        kind: "script",
        moduleSpecifier: "@example/init.js",
      },
    ],
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [assetPlugin],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.assets, [
    {
      pluginName: "asset-plugin",
      kind: "style",
      moduleSpecifier: "@example/theme.css",
      path: "@example/theme.css",
    },
    {
      pluginName: "custom-owner",
      kind: "script",
      moduleSpecifier: "@example/init.js",
      path: "@example/init.js",
    },
  ]);
});

test("multiple views keep output dependencies isolated", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-outputs-"),
  );
  try {
    let title = "One";
    let titleValue = "title-1";
    let fileValue = "file-1";
    const statuses: (string | undefined)[] = [];
    const titleView = defineDerivedView<null, string>({
      id: "test.title-output",
      version: "1",
      compute(_input, context) {
        context.track({
          type: "frontmatter",
          id: "note",
          property: "title",
        });
        return titleValue;
      },
    });
    const fileView = defineDerivedView<null, string>({
      id: "test.file-output",
      version: "1",
      compute(_input, context) {
        context.track({ type: "file", id: "other.md" });
        return fileValue;
      },
    });
    const plugin = definePlugin({
      name: "multi-output",
      derivedViews: [titleView, fileView],
      async planGeneratedOutputs({ derived }) {
        const resolvedTitle = await derived.resolveWithDependencies(
          titleView,
          null,
        );
        const resolvedFile = await derived.resolveWithDependencies(
          fileView,
          null,
        );
        for (const view of [titleView, fileView]) {
          statuses.push(
            derived.inspect().find((execution) => execution.id === view.id)
              ?.cache,
          );
        }
        return [
          {
            path: "title.txt",
            content: resolvedTitle.value,
            derivedDependencies: resolvedTitle.dependencies,
          },
          {
            path: "file.txt",
            content: resolvedFile.value,
            derivedDependencies: resolvedFile.dependencies,
          },
        ];
      },
    });

    const build = async () => {
      const manager = new ContentManager(
        memorySource({
          "note.md": `---\ntitle: ${title}\npublish: true\n---\n`,
          "other.md": "---\ntitle: Other\npublish: true\n---\n",
        }),
        [],
        {
          config: resolveConfig({
            site: { title: "Test" },
            content: { filters: { publishStrategy: "explicit" } },
            cache: { enabled: true, directory: path.join(directory, "cache") },
          }),
          plugins: [plugin],
        },
      );
      return await manager.getManifest();
    };

    const first = await build();
    assert.deepEqual(
      first.generatedOutputs.map((output) => [output.path, output.content]),
      [
        ["file.txt", "file-1"],
        ["title.txt", "title-1"],
      ],
    );
    assert.deepEqual(first.generatedOutputs[0]?.dependencies, [
      { type: "file", path: "other.md" },
    ]);
    assert.deepEqual(first.generatedOutputs[1]?.dependencies, [
      { type: "content", slug: "note" },
    ]);

    title = "Two";
    titleValue = "title-2";
    fileValue = "file-2";
    const second = await build();
    assert.deepEqual(
      second.generatedOutputs.map((output) => [output.path, output.content]),
      [
        ["file.txt", "file-1"],
        ["title.txt", "title-2"],
      ],
    );
    assert.deepEqual(statuses, ["miss", "miss", "miss", "hit"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("removed generated outputs disappear on the next build", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-removed-output-"),
  );
  try {
    let emitSecond = true;
    const view = defineDerivedView<null, string>({
      id: "test.removed-output",
      version: "1",
      compute: () => "value",
    });
    const plugin = definePlugin({
      name: "removable-output",
      derivedViews: [view],
      async planGeneratedOutputs({ derived }) {
        const resolved = await derived.resolveWithDependencies(view, null);
        return [
          {
            path: "first.txt",
            content: resolved.value,
            dependencies: [{ type: "global" }],
            derivedViewIds: resolved.viewIds,
          },
          ...(emitSecond
            ? [
                {
                  path: "second.txt",
                  content: resolved.value,
                  dependencies: [{ type: "global" }],
                  derivedViewIds: resolved.viewIds,
                },
              ]
            : []),
        ];
      },
    });

    const build = async () => {
      const manager = new ContentManager(memorySource(oneNote), [], {
        config: resolveConfig({
          site: { title: "Test" },
          content: { filters: { publishStrategy: "explicit" } },
          cache: { enabled: true, directory: path.join(directory, "cache") },
          buildDirectory: path.join(directory, "build"),
        }),
        plugins: [plugin],
      });
      return await manager.getManifest();
    };

    const first = await build();
    assert.deepEqual(
      first.generatedOutputs.map((output) => output.path),
      ["first.txt", "second.txt"],
    );

    emitSecond = false;
    const second = await build();
    assert.deepEqual(
      second.generatedOutputs.map((output) => output.path),
      ["first.txt"],
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("external dependencies propagate through view chains and survive restarts", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-external-"),
  );
  const cleanDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-external-clean-"),
  );
  try {
    let fingerprint = "v1";
    let available = true;
    let computed = "first";
    const statuses: (string | undefined)[] = [];
    const child = defineDerivedView<null, string>({
      id: "test.external-child",
      version: "1",
      compute(_input, context) {
        context.track({ type: "external", id: "cms" });
        return computed;
      },
    });
    const parent = defineDerivedView<null, string>({
      id: "test.external-parent",
      version: "1",
      async compute(_input, context) {
        return `parent:${await context.resolve(child, null)}`;
      },
    });
    const plugin = definePlugin({
      name: "external-derived",
      derivedViews: [child, parent],
      resolveExternalDependencies: () =>
        available
          ? [
              {
                kind: "resolved" as const,
                snapshot: {
                  id: "cms",
                  fingerprint,
                  scope: { type: "all" as const },
                  value: { ok: true },
                },
              },
            ]
          : [
              {
                kind: "unavailable" as const,
                failure: { id: "cms", reason: "missing" },
              },
            ],
      async planGeneratedOutputs({ derived }) {
        const resolved = await derived.resolveWithDependencies(parent, null);
        statuses.push(
          derived.inspect().find((execution) => execution.id === parent.id)
            ?.cache,
        );
        return [
          {
            path: "external.txt",
            content: resolved.value,
            derivedDependencies: resolved.dependencies,
          },
        ];
      },
    });

    const build = async (cacheDirectory: string) => {
      const manager = new ContentManager(memorySource(oneNote), [], {
        config: resolveConfig({
          site: { title: "Test" },
          content: { filters: { publishStrategy: "explicit" } },
          cache: {
            enabled: true,
            directory: path.join(cacheDirectory, "cache"),
          },
        }),
        plugins: [plugin],
      });
      const manifest = await manager.getManifest();
      return manifest.generatedOutputs[0];
    };

    const first = await build(directory);
    assert.equal(first?.content, "parent:first");
    assert.deepEqual(first?.dependencies, [{ type: "external", id: "cms" }]);

    computed = "second";
    const restarted = await build(directory);
    assert.equal(restarted?.content, "parent:first");

    fingerprint = "v2";
    computed = "third";
    const changed = await build(directory);
    assert.equal(changed?.content, "parent:third");

    computed = "third";
    const clean = await build(cleanDirectory);
    assert.equal(clean?.content, changed?.content);

    available = false;
    computed = "fourth";
    const unavailable = await build(directory);
    assert.equal(unavailable?.content, "parent:fourth");

    assert.deepEqual(statuses, ["miss", "hit", "miss", "miss", "miss"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(cleanDirectory, { recursive: true, force: true });
  }
});

test("body-dependent queries invalidate through file.content", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-body-query-"),
  );
  try {
    let body = "Alpha body";
    let computed = "first";
    const statuses: (string | undefined)[] = [];
    const view = defineDerivedView<null, string>({
      id: "test.body-query",
      version: "1",
      compute(_input, context) {
        context.track({
          type: "query",
          id: "contains-footnote",
          properties: ["file.content"],
        });
        return computed;
      },
    });
    const plugin = definePlugin({
      name: "body-query",
      derivedViews: [view],
      async planGeneratedOutputs({ derived }) {
        const resolved = await derived.resolveWithDependencies(view, null);
        statuses.push(derived.inspect()[0]?.cache);
        return [
          {
            path: "body.txt",
            content: resolved.value,
            derivedDependencies: resolved.dependencies,
          },
        ];
      },
    });
    const build = async () => {
      const manager = new ContentManager(
        memorySource({
          "note.md": `---\ntitle: Note\npublish: true\n---\n${body}\n`,
        }),
        [],
        {
          config: resolveConfig({
            site: { title: "Test" },
            content: { filters: { publishStrategy: "explicit" } },
            cache: { enabled: true, directory: path.join(directory, "cache") },
          }),
          plugins: [plugin],
        },
      );
      const manifest = await manager.getManifest();
      return manifest.generatedOutputs[0];
    };

    assert.equal((await build())?.content, "first");
    computed = "second";
    assert.equal((await build())?.content, "first");
    body = "Alpha body changed";
    computed = "third";
    assert.equal((await build())?.content, "third");
    assert.equal((await build())?.content, "third");
    assert.deepEqual(statuses, ["miss", "hit", "miss", "hit"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("derived dependencies are validated against the current build snapshot", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-dependencies-"),
  );
  try {
    const config = resolveConfig({
      site: { title: "Test" },
      content: { filters: { publishStrategy: "explicit" } },
      cache: { enabled: true, directory: path.join(directory, "cache") },
    });

    let computed = "first";
    const cacheStatuses: (string | undefined)[] = [];
    const build = async (
      view: DerivedView<null, string>,
      pluginName: string,
      files: Record<string, string>,
    ) => {
      const plugin = definePlugin({
        name: pluginName,
        derivedViews: [view],
        async planGeneratedOutputs({ derived }) {
          const resolved = await derived.resolveWithDependencies(view, null);
          cacheStatuses.push(
            derived.inspect().find((execution) => execution.id === view.id)
              ?.cache,
          );
          return [
            {
              path: "derived.txt",
              content: resolved.value,
              derivedDependencies: resolved.dependencies,
            },
          ];
        },
      });
      const manager = new ContentManager(memorySource(files), [], {
        config,
        plugins: [plugin],
      });
      const manifest = await manager.getManifest();
      return String(manifest.generatedOutputs[0]?.content);
    };

    const frontmatter = defineDerivedView<null, string>({
      id: "test.frontmatter-dependency",
      version: "1",
      compute(_input, context) {
        context.track({
          type: "frontmatter",
          id: "note",
          property: "title",
        });
        return computed;
      },
    });
    assert.equal(
      await build(frontmatter, "frontmatter-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n",
      }),
      "first",
    );
    computed = "second";
    assert.equal(
      await build(frontmatter, "frontmatter-plan", {
        "note.md": "---\ntitle: Two\npublish: true\n---\n",
      }),
      "second",
    );
    computed = "third";
    assert.equal(
      await build(frontmatter, "frontmatter-plan", {
        "note.md": "---\ntitle: Two\npublish: true\n---\nUnrelated body.\n",
      }),
      "second",
    );
    assert.deepEqual(cacheStatuses.splice(0), ["miss", "miss", "hit"]);

    computed = "first";
    const query = defineDerivedView<null, string>({
      id: "test.query-dependency",
      version: "1",
      compute(_input, context) {
        context.track({
          type: "query",
          id: "all-titles",
          properties: ["title"],
        });
        return computed;
      },
    });
    assert.equal(
      await build(query, "query-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n",
      }),
      "first",
    );
    computed = "second";
    assert.equal(
      await build(query, "query-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n",
        "added.md": "---\ntitle: Two\npublish: true\n---\n",
      }),
      "second",
    );
    computed = "third";
    assert.equal(
      await build(query, "query-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n",
        "added.md": "---\ntitle: Two\npublish: true\n---\n",
      }),
      "second",
    );
    assert.deepEqual(cacheStatuses.splice(0), ["miss", "miss", "hit"]);

    computed = "first";
    const file = defineDerivedView<null, string>({
      id: "test.file-dependency",
      version: "1",
      compute(_input, context) {
        context.track({ type: "file", id: "note.md" });
        return computed;
      },
    });
    assert.equal(
      await build(file, "file-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nfirst body\n",
      }),
      "first",
    );
    computed = "second";
    assert.equal(
      await build(file, "file-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nsecond body\n",
      }),
      "second",
    );
    computed = "third";
    assert.equal(
      await build(file, "file-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nsecond body\n",
      }),
      "second",
    );
    assert.deepEqual(cacheStatuses.splice(0), ["miss", "miss", "hit"]);

    computed = "first";
    const graph = defineDerivedView<null, string>({
      id: "test.graph-dependency",
      version: "1",
      compute(_input, context) {
        context.track({ type: "graph", id: "all" });
        return computed;
      },
    });
    assert.equal(
      await build(graph, "graph-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nNo links.\n",
      }),
      "first",
    );
    computed = "second";
    assert.equal(
      await build(graph, "graph-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n[[other]]\n",
        "other.md": "---\ntitle: Other\npublish: true\n---\n",
      }),
      "second",
    );
    computed = "third";
    assert.equal(
      await build(graph, "graph-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\n[[other]]\n",
        "other.md": "---\ntitle: Other\npublish: true\n---\n",
      }),
      "second",
    );
    assert.deepEqual(cacheStatuses.splice(0), ["miss", "miss", "hit"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
