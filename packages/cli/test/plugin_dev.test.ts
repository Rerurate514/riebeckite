import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  pluginDevFixtureMarker,
  writePluginDevFixture,
} from "../src/plugin_dev/fixtures.js";
import { loadLocalPlugin } from "../src/plugin_dev/local_plugin.js";

async function createPlugin(
  packageJson: unknown,
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-test-"),
  );
  if (packageJson !== undefined) {
    await fs.writeFile(
      path.join(root, "package.json"),
      typeof packageJson === "string"
        ? packageJson
        : JSON.stringify(packageJson),
      "utf8",
    );
  }
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
  }
  return root;
}

async function withPlugin(
  packageJson: unknown,
  files: Readonly<Record<string, string>>,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await createPlugin(packageJson, files);
  try {
    await task(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("loads a local plugin from a directory and resolves export aliases", async () => {
  await withPlugin(
    {
      name: "@example/plugin-demo",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          source: "./index.ts",
        },
        "./client": { source: "./client.ts" },
        "./style.css": "./style.css",
      },
    },
    {
      "index.ts": "export function demo() {}",
      "client.ts": "export function initDemo() {}",
      "style.css": ".demo {}",
    },
    async (root) => {
      const plugin = await loadLocalPlugin(root);
      assert.equal(plugin.name, "@example/plugin-demo");
      assert.equal(plugin.entry, path.join(root, "index.ts"));
      assert.deepEqual(plugin.aliases, [
        {
          find: "@example/plugin-demo/client",
          replacement: path.join(root, "client.ts"),
        },
        {
          find: "@example/plugin-demo/style.css",
          replacement: path.join(root, "style.css"),
        },
      ]);
    },
  );
});

test("accepts a package.json path and falls back to index.ts", async () => {
  await withPlugin(
    { name: "demo-plugin" },
    { "index.ts": "export function demo() {}" },
    async (root) => {
      const plugin = await loadLocalPlugin(path.join(root, "package.json"));
      assert.equal(plugin.root, root);
      assert.equal(plugin.entry, path.join(root, "index.ts"));
      assert.deepEqual(plugin.aliases, []);
    },
  );
});

test("resolves conventional client and style aliases without exports", async () => {
  await withPlugin(
    { name: "demo-plugin", main: "./entry.js" },
    {
      "entry.js": "export function demo() {}",
      "client.js": "export function initDemo() {}",
      "style.css": ".demo {}",
    },
    async (root) => {
      const plugin = await loadLocalPlugin(root);
      assert.equal(plugin.entry, path.join(root, "entry.js"));
      assert.deepEqual(plugin.aliases, [
        {
          find: "demo-plugin/client",
          replacement: path.join(root, "client.js"),
        },
        {
          find: "demo-plugin/style.css",
          replacement: path.join(root, "style.css"),
        },
      ]);
    },
  );
});

test("resolves a plugin path relative to the current directory", async () => {
  const root = await fs.mkdtemp(
    path.join(process.cwd(), ".tmp-plugin-relative-"),
  );
  try {
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "relative-plugin" }),
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "index.ts"),
      "export function relativePlugin() {}",
      "utf8",
    );
    const plugin = await loadLocalPlugin(path.relative(process.cwd(), root));
    assert.equal(plugin.root, root);
    assert.equal(plugin.entry, path.join(root, "index.ts"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects missing paths and non-plugin directories", async () => {
  await assert.rejects(
    loadLocalPlugin(path.join(os.tmpdir(), "riebeckite-missing-plugin")),
    /Could not find a plugin/,
  );
  await withPlugin(undefined, {}, async (root) => {
    await assert.rejects(loadLocalPlugin(root), /Could not find package.json/);
  });
});

test("rejects invalid package metadata", async () => {
  await withPlugin("{", {}, async (root) => {
    await assert.rejects(loadLocalPlugin(root), /Could not parse package.json/);
  });
  await withPlugin({ name: "Not Valid" }, { "index.ts": "" }, async (root) => {
    await assert.rejects(loadLocalPlugin(root), /valid npm name/);
  });
});

test("writes a deterministic fixture and replaces stale content", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-fixture-"),
  );
  try {
    await fs.mkdir(path.join(root, "content"));
    await fs.writeFile(path.join(root, "content", "stale.md"), "stale", "utf8");
    await writePluginDevFixture(root, "@example/plugin-demo");
    const markdown = await fs.readFile(
      path.join(root, "content", "index.md"),
      "utf8",
    );
    assert.match(markdown, new RegExp(pluginDevFixtureMarker));
    assert.match(markdown, /@example\/plugin-demo preview/);
    assert.match(markdown, /tab="TypeScript"/);
    assert.match(markdown, /tab="JavaScript"/);
    await assert.rejects(fs.access(path.join(root, "content", "stale.md")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects missing, outside, and unsupported entry points", async () => {
  await withPlugin(
    { name: "demo-plugin", main: "./missing.js" },
    {},
    async (root) => {
      await assert.rejects(
        loadLocalPlugin(root),
        /Could not find the plugin entry point/,
      );
    },
  );
  await withPlugin(
    { name: "demo-plugin", main: "../outside.js" },
    {},
    async (root) => {
      await assert.rejects(
        loadLocalPlugin(root),
        /inside the plugin directory/,
      );
    },
  );
  await withPlugin(
    { name: "demo-plugin", main: "./style.css" },
    { "style.css": ".demo {}" },
    async (root) => {
      await assert.rejects(loadLocalPlugin(root), /JavaScript or TypeScript/);
    },
  );
});

test("rejects an entry symlink that resolves outside the plugin directory", {
  skip: process.platform === "win32",
}, async () => {
  await withPlugin(
    { name: "demo-plugin", main: "./entry.js" },
    {},
    async (root) => {
      const outside = path.join(
        os.tmpdir(),
        `riebeckite-outside-${Date.now()}.js`,
      );
      try {
        await fs.writeFile(outside, "export function demo() {}", "utf8");
        await fs.symlink(outside, path.join(root, "entry.js"));
        await assert.rejects(
          loadLocalPlugin(root),
          /resolve inside the plugin directory/,
        );
      } finally {
        await fs.rm(outside, { force: true });
      }
    },
  );
});
