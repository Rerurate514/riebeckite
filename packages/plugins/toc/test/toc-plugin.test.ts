import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { tocPlugin } from "../index.ts";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("tocPlugin registers the style asset and the scroll-spy client entry", () => {
  const plugin = tocPlugin();

  assert.equal(plugin.name, "toc");
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "toc",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-toc/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "toc",
      moduleSpecifier: "@riebeckite/plugin-toc/client",
      exportName: "initTableOfContents",
    },
  ]);
});

test("desktop ToC remains visible from tablet width and sticks in an article rail", () => {
  assert.match(
    style,
    /@media \(min-width: 48rem\) \{[\s\S]*?\.rr-table-of-contents--desktop \{[\s\S]*?display: flex;/,
  );
  assert.match(
    style,
    /@media \(min-width: 88rem\) \{[\s\S]*?\.rr-table-of-contents--desktop \{[\s\S]*?position: sticky;[\s\S]*?top: var\(--rr-toc-sticky-top, var\(--rb-docs-sticky-top, 4rem\)\);[\s\S]*?max-height: calc\([\s\S]*?100dvh[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/,
  );
});
