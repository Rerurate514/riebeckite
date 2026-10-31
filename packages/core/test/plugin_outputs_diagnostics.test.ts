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
import { contentTestConfig } from "./support/content_fixture.js";

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
            dependencies: [{ type: "global" as const }],
            derivedViewIds: resolved.viewIds,
          },
          ...(emitSecond
            ? [
                {
                  path: "second.txt",
                  content: resolved.value,
                  dependencies: [{ type: "global" as const }],
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
      async resolveExternalDependencies() {
        return available
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
            ];
      },
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

test("query fingerprints cover declared filter and sort properties only", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-query-properties-"),
  );
  try {
    let tag = "alpha";
    let otherTitle = "Other";
    let body = "Stable body";
    let computed = "first";
    const statuses: (string | undefined)[] = [];
    const view = defineDerivedView<null, string>({
      id: "test.query-properties",
      version: "1",
      compute(_input, context) {
        context.track({
          type: "query",
          id: "tagged-by-title",
          properties: ["file.tags", "title"],
        });
        return computed;
      },
    });
    const plugin = definePlugin({
      name: "query-properties",
      derivedViews: [view],
      async planGeneratedOutputs({ derived }) {
        const resolved = await derived.resolveWithDependencies(view, null);
        statuses.push(derived.inspect()[0]?.cache);
        return [
          {
            path: "query.txt",
            content: resolved.value,
            derivedDependencies: resolved.dependencies,
          },
        ];
      },
    });
    const build = async () => {
      const manager = new ContentManager(
        memorySource({
          "note.md": `---\ntitle: Note\ntags: [${tag}]\npublish: true\n---\n${body}\n`,
          "other.md": `---\ntitle: ${otherTitle}\npublish: true\n---\nStable\n`,
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
    otherTitle = "Renamed";
    computed = "second";
    assert.equal((await build())?.content, "second");
    body = "Changed body";
    computed = "third";
    assert.equal((await build())?.content, "second");
    tag = "beta";
    computed = "fourth";
    assert.equal((await build())?.content, "fourth");
    assert.deepEqual(statuses, ["miss", "miss", "hit", "miss"]);
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

    computed = "first";
    const content = defineDerivedView<null, string>({
      id: "test.content-dependency",
      version: "1",
      compute(_input, context) {
        context.track({ type: "content", id: "note" });
        return computed;
      },
    });
    assert.equal(
      await build(content, "content-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nfirst body\n",
      }),
      "first",
    );
    computed = "second";
    assert.equal(
      await build(content, "content-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nsecond body\n",
      }),
      "second",
    );
    computed = "third";
    assert.equal(
      await build(content, "content-plan", {
        "note.md": "---\ntitle: One\npublish: true\n---\nsecond body\n",
      }),
      "second",
    );
    assert.deepEqual(cacheStatuses.splice(0), ["miss", "miss", "hit"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("view definition versions invalidate generated outputs across builds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-view-version-"),
  );
  try {
    let version = "1";
    let computed = "first";
    const build = async () => {
      const view = defineDerivedView<null, string>({
        id: "test.versioned-output",
        version,
        compute() {
          return computed;
        },
      });
      const plugin = definePlugin({
        name: "versioned-plan",
        derivedViews: [view],
        async planGeneratedOutputs({ derived }) {
          const resolved = await derived.resolveWithDependencies(view, null);
          return [
            {
              path: "derived.txt",
              content: resolved.value,
              derivedDependencies: resolved.dependencies,
              derivedViewIds: resolved.viewIds,
            },
          ];
        },
      });
      const manager = new ContentManager(memorySource(oneNote), [], {
        config: contentTestConfig(directory),
        plugins: [plugin],
      });
      const manifest = await manager.build({ incremental: true });
      const changes = await manager.getOutputChangeSet({ incremental: true });
      const output = manifest.generatedOutputs[0];
      await manager.dispose();
      return {
        content: String(output?.content),
        dependencies: output?.dependencies,
        affected: changes.affected.map((entry) => entry.path),
        reason: changes.reasons?.get("derived.txt")?.type,
      };
    };

    const first = await build();
    assert.equal(first.content, "first");
    assert.deepEqual(first.dependencies, [
      { type: "derived-view", id: "test.versioned-output", version: "1" },
    ]);

    computed = "second";
    const second = await build();
    assert.ok(!second.affected.includes("derived.txt"));

    version = "2";
    computed = "third";
    const third = await build();
    assert.ok(third.affected.includes("derived.txt"));
    assert.equal(third.reason, "derived-view");
    assert.deepEqual(third.dependencies, [
      { type: "derived-view", id: "test.versioned-output", version: "2" },
    ]);

    const fourth = await build();
    assert.ok(!fourth.affected.includes("derived.txt"));
    assert.equal(fourth.reason, undefined);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("duplicate derived view ids are deduplicated and unknown ids fail", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-view-ids-"),
  );
  try {
    const view = defineDerivedView<null, string>({
      id: "test.duplicate-output",
      version: "1",
      compute() {
        return "value";
      },
    });
    const plugin = definePlugin({
      name: "duplicate-view-plan",
      derivedViews: [view],
      planGeneratedOutputs() {
        const ids = [view.id, view.id];
        return [
          {
            path: "duplicate.txt",
            content: "value",
            dependencies: [{ type: "content", slug: "note" }],
            derivedViewIds: ids,
          },
        ];
      },
    });
    const manager = new ContentManager(memorySource(oneNote), [], {
      config: contentTestConfig(directory),
      plugins: [plugin],
    });
    await manager.build({ incremental: true });
    await manager.getOutputChangeSet({ incremental: true });
    await manager.dispose();
    const secondManager = new ContentManager(memorySource(oneNote), [], {
      config: contentTestConfig(directory),
      plugins: [plugin],
    });
    await secondManager.build({ incremental: true });
    const changes = await secondManager.getOutputChangeSet({
      incremental: true,
    });
    await secondManager.dispose();
    assert.ok(
      !changes.affected.some((entry) => entry.path === "duplicate.txt"),
    );

    const unknownPlugin = definePlugin({
      name: "unknown-view-plan",
      planGeneratedOutputs() {
        return [
          {
            path: "unknown.txt",
            content: "value",
            dependencies: [{ type: "global" }],
            derivedViewIds: ["missing.view"],
          },
        ];
      },
    });
    const unknownManager = new ContentManager(memorySource(oneNote), [], {
      config: contentTestConfig(directory),
      plugins: [unknownPlugin],
    });
    await assert.rejects(
      unknownManager.build(),
      /references unregistered Derived View "missing.view"/,
    );
    await unknownManager.dispose();
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("query fingerprints cover unlisted entries that plans may resolve", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-query-scope-"),
  );
  try {
    const config = resolveConfig({
      site: { title: "Test" },
      content: { filters: { publishStrategy: "explicit" } },
      cache: { enabled: true, directory: path.join(directory, "cache") },
    });
    let hiddenTitle = "Hidden";
    let computed = "first";
    const statuses: (string | undefined)[] = [];
    const build = async () => {
      const view = defineDerivedView<null, string>({
        id: "test.query-scope",
        version: "1",
        compute(_input, context) {
          context.track({
            type: "query",
            id: "titles",
            properties: ["title"],
          });
          return computed;
        },
      });
      const plugin = definePlugin({
        name: "query-scope-plan",
        derivedViews: [view],
        async planGeneratedOutputs({ derived }) {
          const resolved = await derived.resolveWithDependencies(view, null);
          statuses.push(
            derived.inspect().find((entry) => entry.id === view.id)?.cache,
          );
          return [
            {
              path: "titles.txt",
              content: resolved.value,
              derivedDependencies: resolved.dependencies,
            },
          ];
        },
      });
      const manager = new ContentManager(
        memorySource({
          "note.md": "---\ntitle: Note\npublish: true\n---\n",
          "hidden.md": `---\ntitle: ${hiddenTitle}\nvisibility: unlisted\n---\n`,
        }),
        [],
        { config, plugins: [plugin] },
      );
      const manifest = await manager.getManifest();
      await manager.dispose();
      return String(manifest.generatedOutputs[0]?.content);
    };

    assert.equal(await build(), "first");
    hiddenTitle = "Changed";
    computed = "second";
    assert.equal(await build(), "second");
    computed = "third";
    assert.equal(await build(), "second");
    assert.deepEqual(statuses, ["miss", "miss", "hit"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("views can feed multiple outputs and combine into one output", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-output-fan-"),
  );
  try {
    const contentView = defineDerivedView<null, string>({
      id: "test.fan-content",
      version: "1",
      compute(_input, context) {
        context.track({ type: "content", id: "note" });
        return "content";
      },
    });
    const fileView = defineDerivedView<null, string>({
      id: "test.fan-file",
      version: "1",
      compute(_input, context) {
        context.track({ type: "file", id: "note.md" });
        return "file";
      },
    });
    const plugin = definePlugin({
      name: "fan-out-plan",
      derivedViews: [contentView, fileView],
      async planGeneratedOutputs({ derived }) {
        const content = await derived.resolveWithDependencies(
          contentView,
          null,
        );
        const file = await derived.resolveWithDependencies(fileView, null);
        return [
          {
            path: "a.txt",
            content: content.value,
            derivedDependencies: content.dependencies,
            derivedViewIds: content.viewIds,
          },
          {
            path: "a-copy.txt",
            content: content.value,
            derivedDependencies: content.dependencies,
            derivedViewIds: content.viewIds,
          },
          {
            path: "combined.txt",
            content: `${content.value}:${file.value}`,
            derivedDependencies: [
              ...content.dependencies,
              ...file.dependencies,
            ],
            derivedViewIds: [...content.viewIds, ...file.viewIds],
          },
        ];
      },
    });
    const manager = new ContentManager(memorySource(oneNote), [], {
      config: contentTestConfig(directory),
      plugins: [plugin],
    });
    const manifest = await manager.build({ incremental: true });
    await manager.dispose();
    const outputs = new Map(
      manifest.generatedOutputs.map((output) => [output.path, output]),
    );
    assert.equal(outputs.get("a.txt")?.content, "content");
    assert.equal(outputs.get("a-copy.txt")?.content, "content");
    assert.equal(outputs.get("combined.txt")?.content, "content:file");
    assert.deepEqual(outputs.get("a.txt")?.dependencies, [
      { type: "content", slug: "note" },
      { type: "derived-view", id: "test.fan-content", version: "1" },
    ]);
    assert.deepEqual(outputs.get("combined.txt")?.dependencies, [
      { type: "content", slug: "note" },
      { type: "file", path: "note.md" },
      { type: "derived-view", id: "test.fan-content", version: "1" },
      { type: "derived-view", id: "test.fan-file", version: "1" },
    ]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
