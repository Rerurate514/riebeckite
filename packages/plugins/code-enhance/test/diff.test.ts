import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { codeEnhance } from "../index.ts";

async function render(markdown: string): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [codeEnhance()],
  });
  return (await pipeline.execute(markdown)).html;
}

function fenced(language: string, code: string): string {
  return [`\`\`\`${language}`, code, "```"].join("\n");
}

test("does not color diff markers in blocks without a language", async () => {
  const html = await render(
    ["```", "---", "title: value", "---", "```"].join("\n"),
  );

  assert.ok(!html.includes("rr-code__line--remove"), html);
  assert.ok(!html.includes("rr-code__line--add"), html);
});

test("does not color diff markers in non-diff languages", async () => {
  const cases = [
    fenced("yaml", ["---", "title: value", "---"].join("\n")),
    fenced("text", ["---", "old value"].join("\n")),
    fenced("python", ["# ---", "value = 1"].join("\n")),
  ];

  for (const markdown of cases) {
    const html = await render(markdown);
    assert.ok(!html.includes("rr-code__line--remove"), html);
  }
});

test("colors diff markers in diff blocks", async () => {
  const html = await render(
    fenced(
      "diff",
      [
        "--- a/file.txt",
        "+++ b/file.txt",
        "-old line",
        "+new line",
        " context line",
      ].join("\n"),
    ),
  );

  assert.ok(html.includes("rr-code__line--remove"), html);
  assert.ok(html.includes("rr-code__line--add"), html);
});
