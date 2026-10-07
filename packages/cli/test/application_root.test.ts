import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ProjectRootError,
  resolveRiebeckiteProject,
} from "../src/application_root.js";
import { runCheck } from "../src/commands/check.js";

function isHonoxApplicationRootError(error: unknown): boolean {
  return error instanceof Error && error.name === "HonoxApplicationRootError";
}

async function createTemporaryDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(import.meta.dirname, "project-"));
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

test("standalone project uses its own directory as the application root", async () => {
  const root = await createTemporaryDirectory();
  try {
    await writeConfigFile(root);
    await writeViteConfig(root);

    const project = await resolveRiebeckiteProject(root);

    assert.equal(project.invocationCwd, root);
    assert.equal(project.configRoot, root);
    assert.equal(project.projectRoot, root);
    assert.equal(project.appRoot, root);
    assert.equal(project.contentRoot, path.join(root, "content"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("monorepo project resolves the invoked application, not its siblings", async () => {
  const repository = await createTemporaryDirectory();
  try {
    const appRoot = path.join(repository, "apps", "web");
    await writeConfigFile(repository);
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(repository, "apps", "admin"));
    await writeViteConfig(path.join(repository, "fixtures", "minimal"));

    const project = await resolveRiebeckiteProject(appRoot);

    assert.equal(project.configRoot, repository);
    assert.equal(project.projectRoot, repository);
    assert.equal(project.appRoot, appRoot);
    assert.equal(project.contentRoot, path.join(appRoot, "content"));
  } finally {
    await fs.rm(repository, { recursive: true, force: true });
  }
});

test("invocation from a descendant resolves the enclosing application root", async () => {
  const repository = await createTemporaryDirectory();
  try {
    const appRoot = path.join(repository, "site");
    await writeConfigFile(appRoot);
    await writeViteConfig(appRoot);

    const project = await resolveRiebeckiteProject(path.join(appRoot, "app"));

    assert.equal(project.configRoot, appRoot);
    assert.equal(project.appRoot, appRoot);
    assert.equal(project.contentRoot, path.join(appRoot, "content"));
  } finally {
    await fs.rm(repository, { recursive: true, force: true });
  }
});

test("ambiguous config root without an invocation application fails closed", async () => {
  const repository = await createTemporaryDirectory();
  try {
    await writeConfigFile(repository);
    await writeViteConfig(path.join(repository, "apps", "web"));
    await writeViteConfig(path.join(repository, "apps", "admin"));

    await assert.rejects(
      resolveRiebeckiteProject(repository),
      isHonoxApplicationRootError,
    );
  } finally {
    await fs.rm(repository, { recursive: true, force: true });
  }
});

test("missing configuration fails closed", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-missing-config-"),
  );
  try {
    await writeViteConfig(root);
    await assert.rejects(
      resolveRiebeckiteProject(root),
      (error: unknown) => error instanceof ProjectRootError,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("check passes for the resolved application in a monorepo", async () => {
  const repository = await createTemporaryDirectory();
  try {
    const appRoot = path.join(repository, "apps", "web");
    await writeConfigFile(repository);
    await writeViteConfig(appRoot);
    await writeViteConfig(path.join(repository, "apps", "admin"));
    await fs.mkdir(path.join(appRoot, "content"), { recursive: true });

    const project = await resolveRiebeckiteProject(appRoot);

    assert.equal(await runCheck(project), true);
  } finally {
    await fs.rm(repository, { recursive: true, force: true });
  }
});

test("check reports a missing content directory for the resolved application", async () => {
  const repository = await createTemporaryDirectory();
  try {
    const appRoot = path.join(repository, "apps", "web");
    await writeConfigFile(repository);
    await writeViteConfig(appRoot);

    const project = await resolveRiebeckiteProject(appRoot);

    assert.equal(await runCheck(project), false);
  } finally {
    await fs.rm(repository, { recursive: true, force: true });
  }
});
