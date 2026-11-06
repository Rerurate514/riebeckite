import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import { cloneContentRepository } from "../src/content-clone.js";

test("clones the content repository and places the notify workflow", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "site");
    await fs.mkdir(path.join(target, "github"), { recursive: true });
    await fs.writeFile(
      path.join(target, "github", "notify-site.yml"),
      "name: notify\n",
    );

    const calls: Array<{
      command: string;
      args: readonly string[];
      cwd: string;
    }> = [];
    const outcome = await cloneContentRepository({
      targetDirectory: target,
      contentRepository: "octo-org/notes",
      run: async (command, args, cwd) => {
        calls.push({ command, args, cwd });
        await fs.mkdir(path.join(target, "content"), { recursive: true });
        return 0;
      },
    });

    assert.deepEqual(outcome, { status: "cloned" });
    assert.deepEqual(calls, [
      {
        command: "git",
        args: [
          "clone",
          "--",
          "https://github.com/octo-org/notes.git",
          "content",
        ],
        cwd: target,
      },
    ]);
    assert.equal(
      await fs.readFile(
        path.join(target, "content", ".github", "workflows", "notify-site.yml"),
        "utf8",
      ),
      "name: notify\n",
    );
  });
});

test("clones into an existing empty directory", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "site");
    await fs.mkdir(path.join(target, "content"), { recursive: true });
    await fs.mkdir(path.join(target, "github"), { recursive: true });
    await fs.writeFile(
      path.join(target, "github", "notify-site.yml"),
      "name\n",
    );

    const calls: Array<{
      readonly args: readonly string[];
      readonly cwd: string;
    }> = [];
    const outcome = await cloneContentRepository({
      targetDirectory: target,
      contentRepository: "octo-org/notes",
      run: async (_command, args, cwd) => {
        calls.push({ args, cwd });
        return 0;
      },
    });

    assert.deepEqual(outcome, { status: "cloned" });
    assert.deepEqual(calls, [
      {
        args: ["clone", "--", "https://github.com/octo-org/notes.git", "."],
        cwd: path.join(target, "content"),
      },
    ]);
  });
});

test("does not touch a non-empty content directory", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "site");
    const content = path.join(target, "content");
    await fs.mkdir(content, { recursive: true });
    await fs.writeFile(path.join(content, "index.md"), "keep me\n");

    let called = false;
    const outcome = await cloneContentRepository({
      targetDirectory: target,
      contentRepository: "octo-org/notes",
      run: async () => {
        called = true;
        return 0;
      },
    });

    assert.equal(called, false);
    assert.deepEqual(outcome, {
      status: "skipped",
      reason: "the content directory is not empty.",
    });
    assert.equal(
      await fs.readFile(path.join(content, "index.md"), "utf8"),
      "keep me\n",
    );
  });
});

test("does not follow a symbolic link or junction at content", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "site");
    const outside = path.join(root, "outside");
    await fs.mkdir(target, { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, "keep.md"), "keep me\n");
    await fs.symlink(
      outside,
      path.join(target, "content"),
      process.platform === "win32" ? "junction" : "dir",
    );

    let called = false;
    const outcome = await cloneContentRepository({
      targetDirectory: target,
      contentRepository: "octo-org/notes",
      run: async () => {
        called = true;
        return 0;
      },
    });

    assert.equal(called, false);
    assert.deepEqual(outcome, {
      status: "skipped",
      reason: "the content path is a symbolic link or junction.",
    });
    assert.equal(
      await fs.readFile(path.join(outside, "keep.md"), "utf8"),
      "keep me\n",
    );
  });
});

test("leaves a failed clone destination in place", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "site");
    const content = path.join(target, "content");
    await fs.mkdir(target, { recursive: true });

    const outcome = await cloneContentRepository({
      targetDirectory: target,
      contentRepository: "octo-org/notes",
      run: async () => {
        await fs.mkdir(content, { recursive: true });
        await fs.writeFile(path.join(content, "partial.md"), "partial\n");
        return 128;
      },
    });

    assert.deepEqual(outcome, {
      status: "failed",
      reason: "git clone exited with code 128.",
    });
    assert.equal(
      await fs.readFile(path.join(content, "partial.md"), "utf8"),
      "partial\n",
    );
  });
});
