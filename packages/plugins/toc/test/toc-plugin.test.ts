import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { tocPlugin } from "../index.ts";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const component = readFileSync(
  new URL("../components/table-of-contents.tsx", import.meta.url),
  "utf8",
);

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
      initializerArguments: "context",
    },
  ]);
});

test("desktop ToC remains visible from tablet width", () => {
  assert.match(
    style,
    /@media \(min-width: 48rem\) \{[\s\S]*?\.rr-table-of-contents--desktop \{[\s\S]*?display: flex;/,
  );
});

test("the plugin owns desktop ToC placement in the article rail", () => {
  assert.match(component, /rr-table-of-contents--desktop-rail/);
  assert.match(
    style,
    /@media \(min-width: 88rem\) \{[\s\S]*?\.rb-article-layout > \.rr-table-of-contents--desktop-rail \{/,
  );
  assert.match(style, /position: sticky;/);
  assert.match(style, /top: var\(--rb-docs-rail-top\);/);
});
