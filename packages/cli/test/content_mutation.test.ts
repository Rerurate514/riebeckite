import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runContentMutation } from "../src/commands/content.js";

test("a plan that breaks links reports its conflicts and writes nothing", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-cli-"),
  );
  await fs.writeFile(path.join(root, "note.md"), "# Note");
  await fs.writeFile(path.join(root, "source.md"), "[[note]]");
  const lines: string[] = [];
  const log = console.log;
  console.log = (value: unknown) => lines.push(String(value));
  try {
    const applied = await runContentMutation({ contentRoot: root } as never, [
      "create",
      "other/note.md",
    ]);
    assert.equal(applied, false);
  } finally {
    console.log = log;
  }
  assert.match(lines.join("\n"), /Conflict: source\.md:/);
  assert.match(lines.join("\n"), /cannot be applied/);
  await assert.rejects(() => fs.readdir(path.join(root, "other")));
});
