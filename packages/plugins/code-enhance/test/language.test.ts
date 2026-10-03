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

test("normalizes capitalized fence languages to lowercase Shiki ids", async () => {
  const cases: Array<[string, string]> = [
    ["Kotlin", "kotlin"],
    ["Dart", "dart"],
    ["C#", "c#"],
    ["LaTeX", "latex"],
    ["Ts", "ts"],
  ];

  for (const [language, normalized] of cases) {
    const html = await render(fenced(language, "val answer = 42"));
    assert.ok(
      html.includes(`data-language="${normalized}"`),
      `${language} should render as data-language="${normalized}"`,
    );
    assert.ok(
      !html.includes(`data-language="${language}"`),
      `${language} should not keep its original casing`,
    );
  }
});

test("capitalized fence languages are syntax highlighted", async () => {
  const html = await render(fenced("Kotlin", "val answer = 42"));

  assert.ok(
    html.includes("--shiki-light"),
    "expected Shiki token styles for a capitalized fence language",
  );
});

test("lowercase fence languages keep their highlighting", async () => {
  const html = await render(fenced("kotlin", "val answer = 42"));

  assert.ok(html.includes('data-language="kotlin"'));
  assert.ok(html.includes("--shiki-light"));
});

test("uses a fence title for the code header", async () => {
  const html = await render(
    '```ts title="hello.ts"\nconst hello = "world"\n```',
  );

  assert.ok(html.includes('class="rr-code__title">hello.ts</span>'), html);
});

test("code copy button uses an English accessible label", async () => {
  const html = await render(fenced("ts", "const hello = 1"));

  assert.ok(html.includes('aria-label="Copy code"'), html);
  assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9faf]/);
});

test("code copy button does not duplicate source in data-code", async () => {
  const html = await render(fenced("ts", "const hello = 1"));

  assert.ok(html.includes("data-code-copy"), html);
  assert.ok(html.includes("const"), html);
  assert.ok(!html.includes("data-code="), html);
});

test("rendered code preserves copyable text in the code DOM", async () => {
  const html = await render(
    fenced(
      "html",
      ['\t<div data-value="&<>😀">', "  text", "</div>"].join("\n"),
    ),
  );

  assert.match(
    html,
    /<code[^>]*>[\s\S]*\t[\s\S]*&#x26;[\s\S]*&#x3C;[\s\S]*>😀[\s\S]*<\/code>/,
  );
});
