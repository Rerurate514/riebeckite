import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import {
  diff,
  GitMarkdownHistoryReader,
  type MarkdownRevision,
} from "../index.ts";
import {
  createTestRepository,
  gitAvailable,
} from "./support/git_repository.ts";

const options = { skip: !gitAvailable };

const HELLO_V1 = "# Hello\n\nfirst\n";
const HELLO_V2 = "# Hello\n\nfirst\n\nsecond\n";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

test("getHistory follows a note across a rename", options, async () => {
  const repository = createTestRepository("riebeckite-diff-reader-");
  try {
    const first = repository.commit(
      { "notes/hello.md": HELLO_V1 },
      "add hello",
      "2024-01-01T00:00:00+00:00",
    );
    repository.commit(
      { "notes/hello.md": HELLO_V2, "other/lib.ts": "export {};\n" },
      "extend hello",
      "2024-01-02T00:00:00+00:00",
    );
    const renamed = repository.commit(
      { "notes/greeting.md": HELLO_V2, "notes/hello.md": null },
      "rename hello",
      "2024-01-03T00:00:00+00:00",
    );

    // The content root is deliberately not the work tree root, and the test
    // process runs somewhere else entirely.
    const reader = new GitMarkdownHistoryReader({
      cwd: repository.contentRoot,
    });

    const history = await reader.getHistory("greeting.md");
    assert.deepEqual(
      history.map((revision) => revision.message),
      ["rename hello", "extend hello", "add hello"],
    );
    assert.equal(history.at(-1)?.hash, first);

    // `git show <rev>:<path>` is work tree relative. Reading a revision that
    // predates the rename only works when the path recorded for that commit is
    // translated, not passed through as the content-relative lookup key.
    const current = await reader.getRevisionMarkdown("greeting.md", renamed);
    assert.ok(current?.includes("# Hello"));

    const beforeRename = await reader.getRevisionMarkdown(
      "greeting.md",
      history.at(-1)?.hash ?? "",
    );
    assert.ok(beforeRename?.includes("first"));
    assert.equal(beforeRename?.includes("second"), false);
  } finally {
    repository.dispose();
  }
});

test(
  "an unreadable revision returns null instead of throwing",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-diff-missing-");
    try {
      const head = repository.commit(
        { "notes/hello.md": HELLO_V1 },
        "add hello",
        "2024-01-01T00:00:00+00:00",
      );

      const reader = new GitMarkdownHistoryReader({
        cwd: repository.contentRoot,
      });

      assert.equal(
        await reader.getRevisionMarkdown("hello.md", "0".repeat(40)),
        null,
      );
      assert.deepEqual(await reader.getHistory("missing.md"), []);
      assert.equal(head.length, 40);
    } finally {
      repository.dispose();
    }
  },
);

test("readers degrade outside a work tree", options, async () => {
  const repository = createTestRepository("riebeckite-diff-outsider-");
  try {
    const reader = new GitMarkdownHistoryReader({
      cwd: repository.outsiderRoot,
    });

    assert.deepEqual(await reader.getHistory("hello.md"), []);
    assert.equal(await reader.getRevisionMarkdown("hello.md", "abc"), null);
  } finally {
    repository.dispose();
  }
});

test(
  "the plugin reads Git through the configured content directory",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-diff-plugin-");
    try {
      repository.commit(
        { "notes/hello.md": HELLO_V1 },
        "add hello",
        "2024-01-01T00:00:00+00:00",
      );
      repository.commit(
        { "notes/draft.md": HELLO_V1, "notes/hello.md": HELLO_V2 },
        "extend hello",
        "2024-01-02T00:00:00+00:00",
      );

      const content = await new ContentManager(
        memorySource({
          "draft.md": "---\npublish: false\ntitle: Draft\n---\n# Draft",
          "hello.md": "---\npublish: true\ntitle: Hello\n---\n# Hello",
        }),
        [],
        {
          config: resolveConfig({
            site: { title: "Test" },
            content: { directory: repository.contentRoot },
            plugins: [diff({ ui: { maxRevisions: 5 } })],
          }),
        },
      ).getProcessedContent("hello");

      assert.ok(content.html.includes("data-rr-diff-history"));
      assert.ok(content.html.includes("extend hello"));
      assert.match(
        content.html,
        /data-rr-diff-history-data>\{"path":"\/_riebeckite\/diff\/[A-Za-z0-9_-]+\.json"\}<\/script>/,
      );
      assert.equal(content.html.includes(HELLO_V2), false);
      assert.equal(content.html.includes("No Git history is available"), false);
    } finally {
      repository.dispose();
    }
  },
);

test(
  "the plugin emits per-page revision payloads with content dependencies",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-diff-output-");
    try {
      repository.commit(
        { "notes/hello.md": HELLO_V1 },
        "add hello",
        "2024-01-01T00:00:00+00:00",
      );
      repository.commit(
        { "notes/hello.md": HELLO_V2 },
        "extend hello",
        "2024-01-02T00:00:00+00:00",
      );

      const manifest = await new ContentManager(
        memorySource({
          "hello.md": "---\npublish: true\ntitle: Hello\n---\n# Hello",
        }),
        [],
        {
          config: resolveConfig({
            site: { title: "Test" },
            content: { directory: repository.contentRoot },
            plugins: [diff({ ui: { maxRevisions: 5 } })],
          }),
        },
      ).getManifest();

      const outputs = manifest.generatedOutputs.filter((candidate) =>
        candidate.path.startsWith("_riebeckite/diff/"),
      );
      assert.equal(outputs.length, 1);
      const output = outputs[0];
      assert.ok(output);
      assert.equal(output.owner, "diff");
      assert.deepEqual(output.dependencies, [
        { type: "content", slug: "hello" },
      ]);
      const payload = JSON.parse(String(output.content)) as {
        revisions: MarkdownRevision[];
      };
      assert.deepEqual(
        payload.revisions.map((revision) => revision.message),
        ["extend hello", "add hello"],
      );
      assert.equal(payload.revisions[0]?.markdown, HELLO_V2);
    } finally {
      repository.dispose();
    }
  },
);
