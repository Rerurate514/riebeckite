import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { codeAnnotationsPlugin } from "../index.ts";

async function render(markdown: string): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [codeAnnotationsPlugin()],
  });
  return (await pipeline.execute(markdown)).html;
}

test("diff fences render markers and target-language code", async () => {
  const html = await render(
    [
      "```diff ts",
      '+ const message = "Hello";',
      '- const message = "World";',
      "const unchanged = true;",
      "```",
    ].join("\n"),
  );

  assert.match(html, /language-ts/);
  assert.match(html, /rr-code__line--add/);
  assert.match(html, /rr-code__line--remove/);
  assert.match(html, />\+<\/span> const message/);
  assert.match(html, />-<\/span> const message/);
});

test("diff fences accept JavaScript and Python target languages", async () => {
  for (const language of ["js", "python"]) {
    const html = await render(
      [`\`\`\`diff ${language}`, "+ value = 1", "- value = 0", "```"].join(
        "\n",
      ),
    );

    assert.match(html, new RegExp(`language-${language}`));
    assert.match(html, /rr-code__line--add/);
    assert.match(html, /rr-code__line--remove/);
  }
});

test("ordinary code fences and invalid diff fences remain unchanged", async () => {
  const html = await render(
    [
      "```js",
      'const marker = "+";',
      "```",
      "",
      "```diff",
      "+ text",
      "```",
    ].join("\n"),
  );

  assert.match(html, /language-js/);
  assert.match(html, /const marker/);
  assert.match(html, /language-diff/);
  assert.doesNotMatch(html, /rr-code__line--add/);
});
