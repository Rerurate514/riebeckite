import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  HonoxApplicationRootError,
  resolveHonoxApplication,
  resolveHonoxApplicationRoot,
} from "../src/vite_runner.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");

async function createTemporaryDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-root-"));
}

async function writeViteConfig(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "vite.config.ts"),
    "export default {};\n",
  );
}

async function writeConfigFile(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "riebeckite.config.ts"),
    'export default { site: { title: "Test" } };\n',
  );
}

test("findViteApplicationRoot resolves a standalone project at the invocation directory", async () => {
  const root = await createTemporaryDirectory();
  try {
    await writeViteConfig(root);
    assert.equal(await resolveHonoxApplicationRoot(root, root), root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("findViteApplicationRoot returns the nearest application above a nested invocation", async () => {
  const root = await createTemporaryDirectory();
  try {
    const appRoot = path.join(root, "apps", "web");
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(root, "apps", "other"));

    assert.equal(
      await resolveHonoxApplicationRoot(root, path.join(appRoot, "app")),
      appRoot,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("findViteApplicationRoot ignores sibling Vite applications", async () => {
  const root = await createTemporaryDirectory();
  try {
    const appRoot = path.join(root, "packages", "site-a");
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(root, "packages", "site-b"));
    await writeViteConfig(path.join(root, "fixtures", "minimal"));

    assert.equal(await resolveHonoxApplicationRoot(root, appRoot), appRoot);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("findViteApplicationRoot falls back to the single application under the config root", async () => {
  const root = await createTemporaryDirectory();
  try {
    const appRoot = path.join(root, "apps", "web");
    await writeViteConfig(appRoot);

    assert.equal(await resolveHonoxApplicationRoot(root, root), appRoot);
    assert.equal(await resolveHonoxApplicationRoot(root), appRoot);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("findViteApplicationRoot fails closed when the invocation is ambiguous", async () => {
  const root = await createTemporaryDirectory();
  try {
    await writeViteConfig(path.join(root, "apps", "web"));
    await writeViteConfig(path.join(root, "apps", "admin"));

    await assert.rejects(
      resolveHonoxApplicationRoot(root, root),
      (error: unknown) => error instanceof HonoxApplicationRootError,
    );
    await assert.rejects(
      resolveHonoxApplicationRoot(root),
      (error: unknown) => error instanceof HonoxApplicationRootError,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("resolveHonoxApplication uses the start directory to pick the application root", async () => {
  const root = await createTemporaryDirectory();
  try {
    const appRoot = path.join(root, "apps", "web");
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(root, "apps", "admin"));
    await writeConfigFile(root);

    const application = await resolveHonoxApplication({
      configRoot: root,
      startDirectory: path.join(appRoot, "app"),
      workspaceRoot: repositoryRoot,
    });

    assert.equal(application.appRoot, appRoot);
    assert.equal(application.contentRoot, path.join(appRoot, "content"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("resolveHonoxApplication keeps an explicit appRoot scoped to its subtree", async () => {
  const root = await createTemporaryDirectory();
  try {
    const appRoot = path.join(root, "apps", "web");
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(root, "apps", "admin"));
    await writeConfigFile(root);

    const application = await resolveHonoxApplication({
      configRoot: root,
      appRoot,
      workspaceRoot: repositoryRoot,
    });

    assert.equal(application.appRoot, appRoot);
    assert.equal(application.contentRoot, path.join(appRoot, "content"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
