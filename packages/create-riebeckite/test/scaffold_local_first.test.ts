import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  WRANGLER_DEFAULTS,
  WRANGLER_VERSION,
  workerNameFromDirectory,
} from "../src/scaffold/wrangler-defaults.js";

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-local-first-"),
  );
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function readJson<T>(root: string, name: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(root, name), "utf8")) as T;
}

async function fileExists(root: string, name: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, name));
    return true;
  } catch {
    return false;
  }
}

test("local-first scaffold writes a Wrangler config named after the directory", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "My Docs Site");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      cloudflareWorkers: true,
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.name, workerNameFromDirectory("My Docs Site"));
    assert.equal(config.$schema, WRANGLER_DEFAULTS.$schema);
    assert.equal(
      config.compatibility_date,
      WRANGLER_DEFAULTS.compatibility_date,
    );
    assert.deepEqual(
      config.compatibility_flags,
      WRANGLER_DEFAULTS.compatibility_flags,
    );
    assert.deepEqual(config.assets, WRANGLER_DEFAULTS.assets);
  });
});

test("local-first scaffold works without a custom domain", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      cloudflareWorkers: true,
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.routes, undefined);
    assert.equal(config.custom_domain, undefined);
  });
});

test("local-first scaffold adds wrangler and no GitHub Actions workflow", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      cloudflareWorkers: true,
    });

    const manifest = await readJson<{
      devDependencies?: Record<string, string>;
    }>(targetDirectory, "package.json");

    assert.equal(manifest.devDependencies?.wrangler, WRANGLER_VERSION);
    assert.equal(
      await fileExists(targetDirectory, ".github/workflows/deploy.yml"),
      false,
    );
    assert.equal(
      await fileExists(targetDirectory, "github/notify-site.yml"),
      false,
    );
  });
});

test("scaffold without deployment options omits wrangler entirely", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({ targetDirectory });

    const manifest = await readJson<{
      devDependencies?: Record<string, string>;
    }>(targetDirectory, "package.json");

    assert.equal(manifest.devDependencies?.wrangler, undefined);
    assert.equal(await fileExists(targetDirectory, "wrangler.jsonc"), false);
  });
});

test("GitHub Actions scaffold keeps the shared Worker name and no local wrangler", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      githubActions: true,
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );
    const manifest = await readJson<{
      devDependencies?: Record<string, string>;
    }>(targetDirectory, "package.json");

    assert.equal(config.name, WRANGLER_DEFAULTS.name);
    assert.equal(manifest.devDependencies?.wrangler, undefined);
  });
});

test("the scaffold Worker name matches the deploy command for one directory", async () => {
  const directoryName = "Docs.Example";
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, directoryName);
    await scaffoldRiebeckiteSite({
      targetDirectory,
      cloudflareWorkers: true,
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.name, workerNameFromDirectory(directoryName));
  });
});
