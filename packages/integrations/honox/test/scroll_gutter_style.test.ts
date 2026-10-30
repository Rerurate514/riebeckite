import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const styleUrl = new URL("../style.css", import.meta.url);

test("framework styles reserve the scrollbar gutter on the document", async () => {
  const style = await readFile(styleUrl, "utf8");

  assert.match(style, /html \{[\s\S]*?scrollbar-gutter: stable/);
});
