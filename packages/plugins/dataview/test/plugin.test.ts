import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { test } from "node:test";
import { dataview, parseDataview } from "../index.ts";

test("documented dataview blocks are valid queries", async () => {
  for (const file of ["dataview.md", "dataview.ja.md"]) {
    const source = await fs.readFile(
      new URL(`../../../../docs/docs/plugins/${file}`, import.meta.url),
      "utf8",
    );
    const blocks = [...source.matchAll(/```dataview[^\n]*\n([\s\S]*?)```/g)];
    assert.ok(blocks.length > 0, `${file} contains dataview blocks`);
    for (const block of blocks) {
      const parsed = parseDataview(block[1] ?? "");
      assert.equal(
        parsed.status,
        "ok",
        `${file} contains an invalid dataview block: ${parsed.status === "error" ? parsed.message : ""}`,
      );
    }
  }
});

test("dataview still rejects an invalid query type", () => {
  const parsed = parseDataview("FROM #project");

  assert.equal(parsed.status, "error");
  assert.match(
    parsed.status === "error" ? parsed.message : "",
    /unsupported query type `FROM`/,
  );
});

test("validates options", () => {
  const plugin = dataview({ language: "query", limit: 10 });

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      className: " ",
      language: 1,
      hideFallback: "yes",
      limit: Number.NaN,
    } as never),
    [
      { path: "className", message: "Expected a non-empty string." },
      { path: "language", message: "Expected a non-empty string." },
      { path: "hideFallback", message: "Expected a boolean." },
      { path: "limit", message: "Expected a non-negative finite number." },
    ],
  );
});
