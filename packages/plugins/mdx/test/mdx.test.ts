import assert from "node:assert/strict";
import { test } from "node:test";
import mdx from "../index.js";

test("requires explicit trust", () => {
  assert.throws(
    () => mdx({} as never),
    /requires trusted: true because MDX executes authored code/,
  );
});

test("preserves MDX frontmatter without parsing its JSX as Markdown", async () => {
  const plugin = mdx({ trusted: true });
  const format = plugin.contentFormats?.[0];
  assert.ok(format?.process);

  const content = await format.process({
    slug: "example",
    sourcePath: "example.mdx",
    source: "---\ntitle: Example\npublish: true\n---\n\n<Value>{1 + 1}</Value>",
    processMarkdown: async () => {
      throw new Error("MDX must not enter the Markdown renderer");
    },
  });

  assert.deepEqual(content.frontmatter, { title: "Example", publish: true });
  assert.equal(content.html, "");
});

test("strips YAML frontmatter before MDX compilation", () => {
  const plugin = mdx({ trusted: true });
  const [frontmatter] = plugin.vitePlugins?.({
    contentDirectory: "content",
  }) as [{ transform: (code: string, id: string) => unknown }];

  assert.deepEqual(
    frontmatter.transform("---\ntitle: Example\n---\n\n# Heading", "page.mdx"),
    { code: "\n# Heading", map: null },
  );
  assert.equal(frontmatter.transform("# Heading", "page.mdx"), null);
  assert.equal(
    frontmatter.transform("---\ntitle: Example\n---\n\n# Heading", "page.md"),
    null,
  );
});
