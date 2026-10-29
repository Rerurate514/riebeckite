import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { PLUGIN_MARKDOWN_GUIDES } from "../src/scaffold/content-pages.js";
import { scaffoldPresets } from "../src/scaffold/presets.js";
import {
  demoPackage,
  README_DEMO_ORDER,
  README_DEMOS,
} from "../src/scaffold/readme_demos.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");

async function workspacePluginPackages(): Promise<ReadonlySet<string>> {
  const pluginsDirectory = path.join(repositoryRoot, "packages", "plugins");
  const entries = await fs.readdir(pluginsDirectory, { withFileTypes: true });
  const names = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const manifest = JSON.parse(
          await fs.readFile(
            path.join(pluginsDirectory, entry.name, "package.json"),
            "utf8",
          ),
        ) as { readonly name: string };
        return manifest.name;
      }),
  );
  return new Set(names);
}

test("scaffold plugin catalogs only reference workspace plugins", async () => {
  const packages = await workspacePluginPackages();
  const references = new Set([
    ...Object.keys(PLUGIN_MARKDOWN_GUIDES),
    ...Object.keys(README_DEMOS).map(demoPackage),
    ...Object.values(scaffoldPresets).flatMap((preset) =>
      preset.plugins.map((plugin) => plugin.package),
    ),
  ]);

  assert.deepEqual(
    [...references].filter((packageName) => !packages.has(packageName)),
    [],
  );
  assert.deepEqual(
    README_DEMO_ORDER.filter((key) => README_DEMOS[key] === undefined),
    [],
  );
});
