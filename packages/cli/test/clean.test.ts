import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ContentManager,
  type ResolvedRiebeckiteConfig,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { parseCommand } from "../src/cli.js";
import {
  removeManagedPath,
  runClean,
  UnsafeCleanPathError,
} from "../src/commands/clean.js";

function makeConfig(root: string): ResolvedRiebeckiteConfig {
  return {
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "Test", description: "", language: "en" },
    },
    content: {
      directory: path.join(root, "content"),
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "riebeckite",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins: [],
    cache: { enabled: false, directory: "" },
    buildDirectory: path.join(root, ".riebeckite"),
    outputDirectory: path.join(root, "dist"),
  };
}

function makeProject(
  root: string,
  config = makeConfig(root),
): RiebeckiteProject {
  return {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: config.content.directory,
    config,
  };
}

async function makeRoot(prefix = "riebeckite-clean-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function seedState(root: string): Promise<void> {
  await fs.mkdir(path.join(root, ".riebeckite", "build"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".riebeckite", "build", "content-state.json"),
    "{}",
  );
  await fs.mkdir(path.join(root, ".riebeckite", "cache", "content"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, ".riebeckite", "ssg-output-cache.json"),
    "{}",
  );
}

async function seedOutput(root: string): Promise<void> {
  await fs.mkdir(path.join(root, "dist", "notes"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  await fs.writeFile(
    path.join(root, "dist", "notes", "a.html"),
    "<html></html>",
  );
}

async function pathExists(target: string): Promise<boolean> {
  return fs
    .lstat(target)
    .then(() => true)
    .catch(() => false);
}

async function withCapturedLogs<T>(
  task: () => Promise<T>,
): Promise<[T, string[]]> {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((value) => String(value)).join(" "));
  };
  try {
    return [await task(), logs];
  } finally {
    console.log = original;
  }
}

test("clean removes managed state and keeps output and user files", async () => {
  const root = await makeRoot();
  await seedState(root);
  await seedOutput(root);
  await fs.mkdir(path.join(root, "content"), { recursive: true });
  await fs.writeFile(
    path.join(root, "riebeckite.config.ts"),
    "export default {};",
  );

  await runClean(makeProject(root), { scope: "state" });

  assert.equal(await pathExists(path.join(root, ".riebeckite")), false);
  assert.equal(await pathExists(path.join(root, "dist", "index.html")), true);
  assert.equal(await pathExists(path.join(root, "content")), true);
  assert.equal(await pathExists(path.join(root, "riebeckite.config.ts")), true);
});

test("clean --output removes output and keeps managed state", async () => {
  const root = await makeRoot();
  await seedState(root);
  await seedOutput(root);

  await runClean(makeProject(root), { scope: "output" });

  assert.equal(await pathExists(path.join(root, "dist")), false);
  assert.equal(
    await pathExists(
      path.join(root, ".riebeckite", "build", "content-state.json"),
    ),
    true,
  );
});

test("clean --all removes managed state and output", async () => {
  const root = await makeRoot();
  await seedState(root);
  await seedOutput(root);

  await runClean(makeProject(root), { scope: "all" });

  assert.equal(await pathExists(path.join(root, ".riebeckite")), false);
  assert.equal(await pathExists(path.join(root, "dist")), false);
});

test("clean succeeds when the targets do not exist", async () => {
  const root = await makeRoot();
  await runClean(makeProject(root), { scope: "all" });
  await runClean(makeProject(root), { scope: "all" });
});

test("clean resolves the configured output directory", async () => {
  const root = await makeRoot();
  const config = {
    ...makeConfig(root),
    outputDirectory: path.join(root, "custom-output"),
  };
  await fs.mkdir(config.outputDirectory as string, { recursive: true });
  await fs.writeFile(
    path.join(config.outputDirectory as string, "index.html"),
    "",
  );
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "keep.html"), "");

  await runClean(makeProject(root, config), { scope: "output" });

  assert.equal(await pathExists(config.outputDirectory as string), false);
  assert.equal(await pathExists(path.join(root, "dist", "keep.html")), true);
});

test("clean does nothing for output when no output directory is configured", async () => {
  const root = await makeRoot();
  const config = { ...makeConfig(root) };
  delete (config as { outputDirectory?: string }).outputDirectory;
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "");

  await runClean(makeProject(root, config), { scope: "output" });

  assert.equal(await pathExists(path.join(root, "dist", "index.html")), true);
});

test("removeManagedPath rejects paths outside the application boundary", async () => {
  const root = await makeRoot();
  const outside = await makeRoot("riebeckite-outside-");
  await fs.writeFile(path.join(outside, "keep.txt"), "keep");

  await assert.rejects(
    removeManagedPath(root, outside),
    (error: unknown) => error instanceof UnsafeCleanPathError,
  );
  assert.equal(await pathExists(path.join(outside, "keep.txt")), true);
});

test("removeManagedPath rejects the application root itself", async () => {
  const root = await makeRoot();
  await assert.rejects(
    removeManagedPath(root, root),
    (error: unknown) => error instanceof UnsafeCleanPathError,
  );
  assert.equal(await pathExists(root), true);
});

test("clean removes a junction without touching its target", async (t) => {
  const root = await makeRoot();
  const target = await makeRoot("riebeckite-link-target-");
  await fs.writeFile(path.join(target, "user-file.txt"), "user");
  const link = path.join(root, ".riebeckite");
  try {
    await fs.symlink(target, link, "junction");
  } catch (error) {
    t.diagnostic(`Skipping symlink test: ${String(error)}`);
    return;
  }

  await runClean(makeProject(root), { scope: "state" });

  assert.equal(await pathExists(link), false);
  assert.equal(await pathExists(path.join(target, "user-file.txt")), true);
});

test("clean removes a nested junction without touching its target", async (t) => {
  const root = await makeRoot();
  const target = await makeRoot("riebeckite-nested-target-");
  await fs.writeFile(path.join(target, "user-file.txt"), "user");
  await fs.mkdir(path.join(root, ".riebeckite", "cache"), { recursive: true });
  await fs.writeFile(path.join(root, ".riebeckite", "build.json"), "{}");
  const link = path.join(root, ".riebeckite", "cache", "linked");
  try {
    await fs.symlink(target, link, "junction");
  } catch (error) {
    t.diagnostic(`Skipping nested symlink test: ${String(error)}`);
    return;
  }

  await runClean(makeProject(root), { scope: "state" });

  assert.equal(await pathExists(path.join(root, ".riebeckite")), false);
  assert.equal(await pathExists(path.join(target, "user-file.txt")), true);
});

test("clean removes a symlinked output directory without touching its target", async (t) => {
  const root = await makeRoot();
  const target = await makeRoot("riebeckite-output-target-");
  await fs.writeFile(path.join(target, "user-file.txt"), "user");
  const link = path.join(root, "dist");
  try {
    await fs.symlink(target, link, "dir");
  } catch (error) {
    t.diagnostic(`Skipping symlinked output test: ${String(error)}`);
    return;
  }

  await runClean(makeProject(root), { scope: "output" });

  assert.equal(await pathExists(link), false);
  assert.equal(await pathExists(path.join(target, "user-file.txt")), true);
});

test("clean keeps user-authored files and repository metadata", async () => {
  const root = await makeRoot();
  await seedState(root);
  await seedOutput(root);
  const userFiles = [
    "content/index.md",
    "riebeckite.config.ts",
    ".git/config",
    "src/app.ts",
    "public/logo.png",
  ];
  for (const file of userFiles) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), "user");
  }

  await runClean(makeProject(root), { scope: "all" });

  for (const file of userFiles) {
    assert.equal(await pathExists(path.join(root, file)), true, file);
  }
});

test("clean regenerates managed state on the next build", async () => {
  const root = await makeRoot();
  const config = makeConfig(root);
  const project = makeProject(root, config);
  await fs.mkdir(config.content.directory, { recursive: true });
  await fs.writeFile(
    path.join(config.content.directory, "index.md"),
    "---\ntitle: Home\nvisibility: public\n---\n\n# Home\n",
  );

  const build = async () => {
    const content = new ContentManager(
      config.content.directory,
      config.content.exclude,
      {
        config,
      },
    );
    await content.build({ incremental: true });
    content.dispose();
  };

  await build();
  const statePath = resolveContentBuildStatePath(
    config,
    config.content.directory,
  );
  assert.equal(await pathExists(statePath), true);

  await runClean(project, { scope: "all" });
  assert.equal(await pathExists(statePath), false);
  assert.equal(await pathExists(path.join(root, "dist")), false);

  await build();
  assert.equal(await pathExists(statePath), true);
});

test("clean prints the scope-specific message", async () => {
  const root = await makeRoot();
  const project = makeProject(root);

  const [, stateLogs] = await withCapturedLogs(() =>
    runClean(project, { scope: "state" }),
  );
  assert.deepEqual(stateLogs, ["Cleaned Riebeckite state."]);

  const [, outputLogs] = await withCapturedLogs(() =>
    runClean(project, { scope: "output" }),
  );
  assert.deepEqual(outputLogs, ["Cleaned build output."]);

  const [, allLogs] = await withCapturedLogs(() =>
    runClean(project, { scope: "all" }),
  );
  assert.deepEqual(allLogs, ["Cleaned Riebeckite state and build output."]);
});

test("parseCommand accepts the clean scopes", () => {
  assert.deepEqual(parseCommand(["clean"]), { name: "clean", scope: "state" });
  assert.deepEqual(parseCommand(["clean", "--output"]), {
    name: "clean",
    scope: "output",
  });
  assert.deepEqual(parseCommand(["clean", "--all"]), {
    name: "clean",
    scope: "all",
  });
});

test("parseCommand rejects unknown clean options", () => {
  assert.throws(() => parseCommand(["clean", "--force"]), /Usage: riebeckite/);
  assert.throws(
    () => parseCommand(["clean", "--output", "--all"]),
    /Usage: riebeckite/,
  );
});

test("the usage message lists the clean options", () => {
  try {
    parseCommand(["--help"]);
    assert.fail("expected a usage error");
  } catch (error) {
    assert.match(String(error), /clean \[--output \| --all\]/);
  }
});
