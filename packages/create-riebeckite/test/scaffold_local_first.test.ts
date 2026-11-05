import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  CLOUDFLARE_WORKERS_DEFAULTS,
  WRANGLER_VERSION,
  workerNameFromDirectory,
} from "../src/scaffold/wrangler-defaults.js";

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
  await withTemporaryDirectory("riebeckite-local-first-", async (directory) => {
    const targetDirectory = path.join(directory, "My Docs Site");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "cloudflare-workers" },
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.name, workerNameFromDirectory("My Docs Site"));
    assert.equal(config.$schema, CLOUDFLARE_WORKERS_DEFAULTS.$schema);
    assert.equal(
      config.compatibility_date,
      CLOUDFLARE_WORKERS_DEFAULTS.compatibility_date,
    );
    assert.deepEqual(
      config.compatibility_flags,
      CLOUDFLARE_WORKERS_DEFAULTS.compatibility_flags,
    );
    assert.deepEqual(config.assets, CLOUDFLARE_WORKERS_DEFAULTS.assets);
  });
});

test("local-first scaffold works without a custom domain", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "cloudflare-workers" },
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.routes, undefined);
    assert.equal(config.custom_domain, undefined);
  });
});

test("local-first scaffold adds the custom domain route", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "cloudflare-workers" },
      customDomain: "docs.example.com",
    });

    const config = await readJson<{
      routes?: readonly { pattern: string; custom_domain?: boolean }[];
    }>(targetDirectory, "wrangler.jsonc");

    assert.deepEqual(config.routes, [
      { pattern: "docs.example.com", custom_domain: true },
    ]);
  });
});

test("scaffold reads content from a separate directory without generating starter pages", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "site");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "github-actions", content: { type: "local" } },
      contentDirectory: "../vault",
    });

    const config = await fs.readFile(
      path.join(targetDirectory, "riebeckite.config.ts"),
      "utf8",
    );
    assert.ok(config.includes('directory: "../vault"'));
    assert.equal(await fileExists(targetDirectory, "content/index.md"), false);
    assert.equal(await fileExists(targetDirectory, "content"), false);
  });
});

test("local-first scaffold adds wrangler and no GitHub Actions workflow", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "cloudflare-workers" },
    });

    const manifest = await readJson<{
      devDependencies?: Record<string, string>;
    }>(targetDirectory, "package.json");

    assert.equal(manifest.devDependencies?.wrangler, WRANGLER_VERSION);
    assert.equal(
      await fileExists(targetDirectory, ".github/workflows/publish.yml"),
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

test("GitHub Actions scaffold names the Worker after the project and keeps no local wrangler", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "docs");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "github-actions", content: { type: "local" } },
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );
    const manifest = await readJson<{
      devDependencies?: Record<string, string>;
    }>(targetDirectory, "package.json");

    assert.equal(config.name, workerNameFromDirectory("docs"));
    assert.equal(manifest.devDependencies?.wrangler, undefined);
  });
});

test("the scaffold Worker name matches the deploy command for one directory", async () => {
  const directoryName = "Docs.Example";
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, directoryName);
    await scaffoldRiebeckiteSite({
      targetDirectory,
      deployment: { type: "cloudflare-workers" },
    });

    const config = await readJson<Record<string, unknown>>(
      targetDirectory,
      "wrangler.jsonc",
    );

    assert.equal(config.name, workerNameFromDirectory(directoryName));
  });
});
