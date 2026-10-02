import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  type GitRepositoryPaths,
  normalizeContentPath,
  resolveRepositoryPaths,
  toContentPath,
  toRepositoryPath,
} from "../src/git/repo_paths.ts";
import { runGit } from "../src/git/run_git.ts";
import {
  createTestRepository,
  gitAvailable,
} from "./support/git_repository.ts";

const nested: GitRepositoryPaths = {
  repositoryRoot: "/site",
  contentRoot: "/site/docs",
  contentPrefix: "docs",
};

const flat: GitRepositoryPaths = {
  repositoryRoot: "/site",
  contentRoot: "/site",
  contentPrefix: "",
};

test("normalizeContentPath rewrites separators and strips a leading ./", () => {
  assert.equal(normalizeContentPath("notes\\hello.md"), "notes/hello.md");
  assert.equal(normalizeContentPath("./notes/hello.md"), "notes/hello.md");
  assert.equal(normalizeContentPath("notes/hello.md"), "notes/hello.md");
});

test("toRepositoryPath prefixes a content-relative path with the content root", () => {
  assert.equal(toRepositoryPath(nested, "hello.md"), "docs/hello.md");
  assert.equal(toRepositoryPath(flat, "hello.md"), "hello.md");
});

test("toContentPath strips the content prefix and rejects foreign paths", () => {
  assert.equal(toContentPath(nested, "docs/hello.md"), "hello.md");
  assert.equal(toContentPath(flat, "hello.md"), "hello.md");

  // Outside the content directory, or the directory itself rather than a file.
  assert.equal(toContentPath(nested, "packages/index.ts"), null);
  assert.equal(toContentPath(nested, "docs"), null);
  assert.equal(toContentPath(nested, ""), null);
  // A sibling directory whose name merely starts with the prefix.
  assert.equal(toContentPath(nested, "docs-archive/hello.md"), null);
});

test("toContentPath inverts toRepositoryPath for every content path", () => {
  for (const paths of [nested, flat]) {
    for (const filePath of ["hello.md", "notes/deep/hello.md"]) {
      assert.equal(
        toContentPath(paths, toRepositoryPath(paths, filePath)),
        filePath,
      );
    }
  }
});

test("resolveRepositoryPaths reports the content root relative to the work tree", {
  skip: !gitAvailable,
}, async () => {
  const repository = createTestRepository("riebeckite-repo-paths-");
  try {
    const resolution = await resolveRepositoryPaths(repository.contentRoot);

    assert.equal(resolution.kind, "resolved");
    if (resolution.kind !== "resolved") return;

    assert.equal(resolution.paths.contentPrefix, "notes");
    assert.equal(
      resolution.paths.contentRoot,
      normalizeContentPath(path.resolve(repository.contentRoot)),
    );
    assert.equal(
      resolution.paths.repositoryRoot,
      normalizeContentPath(path.resolve(repository.root)),
    );
  } finally {
    repository.dispose();
  }
});

test("resolveRepositoryPaths reports a content directory outside any work tree", {
  skip: !gitAvailable,
}, async () => {
  const outsider = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "riebeckite-out-"),
  );
  try {
    // A `.git` file pointing nowhere makes Git stop searching parent folders,
    // so the outcome does not depend on where the temp directory happens to live.
    fs.writeFileSync(
      path.join(outsider, ".git"),
      "gitdir: ./missing-git-dir\n",
    );

    const resolution = await resolveRepositoryPaths(outsider);

    assert.equal(resolution.kind, "content-outside-repository");
  } finally {
    fs.rmSync(outsider, { recursive: true, force: true });
  }
});

test("runGit separates 'Git never started' from 'Git rejected the command'", {
  skip: !gitAvailable,
}, async () => {
  const repository = createTestRepository("riebeckite-run-git-");
  try {
    // A missing working directory surfaces as a spawn-level failure, which is
    // why resolveRepositoryPaths passes `-C <dir>` instead of a cwd: it keeps
    // "Git is missing" reserved for a genuinely missing executable.
    const spawnFailure = await runGit(
      ["rev-parse", "--show-toplevel"],
      path.join(repository.root, "no-such-directory"),
    );
    assert.equal(spawnFailure.ok, false);
    assert.equal(spawnFailure.ok === false && spawnFailure.spawnError, true);

    const rejectedCommand = await runGit([
      "-C",
      repository.root,
      "show",
      "HEAD:missing-file.md",
    ]);
    assert.equal(rejectedCommand.ok, false);
    assert.equal(
      rejectedCommand.ok === false && rejectedCommand.spawnError,
      false,
    );
    assert.equal(
      rejectedCommand.ok === false && rejectedCommand.detail.includes("fatal:"),
      true,
    );
  } finally {
    repository.dispose();
  }
});
