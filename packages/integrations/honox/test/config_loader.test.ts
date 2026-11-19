import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadRiebeckiteConfig } from "../src/config_loader.js";

test("loads a config from a directory without workspace package links", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "riebeckite-config-"));
  try {
    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "External config" } };\n',
      "utf8",
    );

    const config = await loadRiebeckiteConfig({
      configRoot,
      workspaceRoot: path.resolve(import.meta.dirname, "../../../.."),
    });

    assert.equal(config.site.title, "External config");

    const manifestPath = path.join(
      configRoot,
      ".riebeckite",
      "config-bundle",
      "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      output: string;
      inputs: { path: string; digest: string }[];
    };
    assert.match(manifest.output, /^config-[0-9a-f]{16}\.mjs$/);
    assert.ok(manifest.inputs.some(({ digest }) => typeof digest === "string"));
    await access(
      path.join(configRoot, ".riebeckite", "config-bundle", manifest.output),
    );
  } finally {
    await rm(configRoot, { recursive: true, force: true });
  }
});

test("reuses the cached config bundle when inputs are unchanged", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "riebeckite-config-"));
  try {
    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "Cached config" } };\n',
      "utf8",
    );
    const options = {
      configRoot,
      workspaceRoot: path.resolve(import.meta.dirname, "../../../.."),
    };

    const first = await loadRiebeckiteConfig(options);
    const manifestPath = path.join(
      configRoot,
      ".riebeckite",
      "config-bundle",
      "manifest.json",
    );
    const manifestMtimeAfterFirst = (await stat(manifestPath)).mtimeMs;
    const second = await loadRiebeckiteConfig(options);
    const manifestMtimeAfterSecond = (await stat(manifestPath)).mtimeMs;

    assert.strictEqual(second, first);
    assert.equal(manifestMtimeAfterSecond, manifestMtimeAfterFirst);
  } finally {
    await rm(configRoot, { recursive: true, force: true });
  }
});

test("keeps separate cache entries per config file variant", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "riebeckite-config-"));
  try {
    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "Default variant" } };\n',
      "utf8",
    );
    await writeFile(
      path.join(configRoot, "riebeckite.config.prod.ts"),
      'export default { site: { title: "Prod variant" } };\n',
      "utf8",
    );
    const baseOptions = {
      configRoot,
      workspaceRoot: path.resolve(import.meta.dirname, "../../../.."),
    };

    await loadRiebeckiteConfig(baseOptions);
    const variant = await loadRiebeckiteConfig({
      ...baseOptions,
      configFile: "riebeckite.config.prod.ts",
    });

    assert.equal(variant.site.title, "Prod variant");
  } finally {
    await rm(configRoot, { recursive: true, force: true });
  }
});

test("rebuilds the config bundle when a recorded input changes", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "riebeckite-config-"));
  try {
    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "Original" } };\n',
      "utf8",
    );
    const options = {
      configRoot,
      workspaceRoot: path.resolve(import.meta.dirname, "../../../.."),
    };

    const first = await loadRiebeckiteConfig(options);
    assert.equal(first.site.title, "Original");

    await writeFile(
      path.join(configRoot, "riebeckite.config.ts"),
      'export default { site: { title: "Updated" } };\n',
      "utf8",
    );

    const second = await loadRiebeckiteConfig(options);
    assert.equal(second.site.title, "Updated");
    assert.notStrictEqual(second, first);
  } finally {
    await rm(configRoot, { recursive: true, force: true });
  }
});
