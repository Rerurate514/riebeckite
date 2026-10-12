import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { test } from "node:test";

import { markdown, withTemporaryDirectory } from "../fixtures.js";

test("markdown adds frontmatter without obscuring the content fixture", () => {
  assert.equal(
    markdown("# Note", { publish: true, tags: ["test", "cache"] }),
    '---\npublish: true\ntags: ["test", "cache"]\n---\n\n# Note',
  );
});

test("withTemporaryDirectory removes the workspace after the test callback", async () => {
  let directory = "";
  await withTemporaryDirectory("riebeckite-fixture-", async (temporary) => {
    directory = temporary;
    await fs.writeFile(`${temporary}/fixture.md`, "# fixture", "utf8");
  });
  await assert.rejects(fs.access(directory));
});
