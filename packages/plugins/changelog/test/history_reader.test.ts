import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { GitChangelogReader } from "../index.ts";
import {
  createTestRepository,
  gitAvailable,
} from "./support/git_repository.ts";

const options = { skip: !gitAvailable };

test(
  "getFileHistory follows a note regardless of the process working directory",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-changelog-reader-");
    try {
      repository.commit(
        {
          "notes/hello.md": "# Hello\n\nfirst\n",
          "notes/changelog.md": "# Changelog\n",
          "notes/index.md": "# Index\n",
        },
        "add notes",
        "2024-01-01T00:00:00+00:00",
      );
      // A commit that touches both the content directory and a sibling folder.
      repository.commit(
        {
          "notes/hello.md": "# Hello\n\nfirst\n\nsecond\n",
          "other/lib.ts": "export {};\n",
        },
        "edit hello beside lib",
        "2024-01-02T00:00:00+00:00",
      );
      repository.commit(
        { "notes/hello.md": "# Hello\n\nfirst\n\nsecond\n\nthird\n" },
        "extend hello",
        "2024-01-03T00:00:00+00:00",
      );

      // The reader is pointed at the content root while the test process runs
      // elsewhere: exactly the layout a monorepo build has.
      const reader = new GitChangelogReader({ cwd: repository.contentRoot });

      assert.equal(await reader.isAvailable(), true);
      assert.equal((await reader.resolveRepository()).kind, "resolved");

      const history = await reader.getFileHistory("hello.md");
      assert.deepEqual(
        history.map((commit) => commit.subject),
        ["extend hello", "edit hello beside lib", "add notes"],
      );
      assert.equal(history[0]?.hash.length, 40);
      assert.equal(path.isAbsolute(history[0]?.hash ?? ""), false);

      const recent = await reader.getRecentCommits();
      assert.deepEqual(
        recent.map((commit) => commit.subject),
        ["extend hello", "edit hello beside lib", "add notes"],
      );
      // Paths come back relative to the content directory, never to the work
      // tree root, and files outside the content directory are dropped.
      assert.deepEqual(
        recent.map((commit) => [...commit.files].sort()),
        [["hello.md"], ["hello.md"], ["changelog.md", "hello.md", "index.md"]],
      );
    } finally {
      repository.dispose();
    }
  },
);

test("getFileHistory honours a lookback window", options, async () => {
  const repository = createTestRepository("riebeckite-changelog-window-");
  try {
    repository.commit(
      { "notes/hello.md": "# Hello\n\nfirst\n" },
      "add hello",
      "2024-01-01T00:00:00+00:00",
    );
    repository.commit(
      { "notes/hello.md": "# Hello\n\nfirst\n\nsecond\n" },
      "extend hello",
      "2024-06-01T00:00:00+00:00",
    );

    const reader = new GitChangelogReader({ cwd: repository.contentRoot });

    assert.deepEqual(
      (
        await reader.getFileHistory("hello.md", {
          since: "2024-05-01T00:00:00.000Z",
        })
      ).map((commit) => commit.subject),
      ["extend hello"],
    );
    assert.equal((await reader.getFileHistory("hello.md")).length, 2);
    assert.deepEqual(
      (
        await reader.getRecentCommits({ since: "2024-05-01T00:00:00.000Z" })
      ).map((commit) => commit.subject),
      ["extend hello"],
    );
  } finally {
    repository.dispose();
  }
});

test(
  "readers degrade to empty history outside a work tree",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-changelog-outsider-");
    try {
      const reader = new GitChangelogReader({ cwd: repository.outsiderRoot });

      assert.equal(await reader.isAvailable(), false);
      assert.equal(
        (await reader.resolveRepository()).kind,
        "content-outside-repository",
      );
      assert.deepEqual(await reader.getFileHistory("hello.md"), []);
      assert.deepEqual(await reader.getRecentCommits(), []);
    } finally {
      repository.dispose();
    }
  },
);

test(
  "an unknown note has no history instead of failing the build",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-changelog-unknown-");
    try {
      repository.commit(
        { "notes/hello.md": "# Hello\n" },
        "add hello",
        "2024-01-01T00:00:00+00:00",
      );

      const reader = new GitChangelogReader({ cwd: repository.contentRoot });
      assert.deepEqual(await reader.getFileHistory("missing.md"), []);
    } finally {
      repository.dispose();
    }
  },
);
