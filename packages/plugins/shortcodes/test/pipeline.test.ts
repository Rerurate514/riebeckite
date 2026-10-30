import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import { shortcodes } from "../index.ts";

function createPipeline(): Pipeline {
  return new Pipeline(new Map(), new Map(), undefined, {
    plugins: [shortcodes()],
  });
}

test("golden: shortcodes render through the markdown pipeline", async () => {
  const markdown = [
    "::badge[Stable]{variant=success}",
    "",
    '::does-not-exist[Foo]{a="<b>"}',
    "",
    '::link-card{url="/a?x=1&y=2" title="Docs & API"}',
    "",
    ":::note[My Title]",
    "",
    "Body text with a `code` span.",
    "",
    ":::",
  ].join("\n");

  const { html } = await createPipeline().execute(markdown);

  assertGolden(html, new URL("./__golden__/shortcodes.html", import.meta.url));
});

test("standalone leaf directives keep their paragraph boundary", async () => {
  const markdown = [
    "::badge[Stable]{variant=success}",
    "",
    "::kbd[Ctrl+Shift+P]",
  ].join("\n");

  const { html } = await createPipeline().execute(markdown);

  assert.match(
    html,
    /<div class="rb-shortcode rb-shortcode--badge">[\s\S]*?<\/div>\s*<div class="rb-shortcode rb-shortcode--kbd">/,
  );
  assert.doesNotMatch(
    html,
    /<span class="rb-shortcode rb-shortcode--(badge|kbd)">/,
  );
});

test("inline text directives render inside the surrounding paragraph", async () => {
  const { html } = await createPipeline().execute(
    "Text :badge[Stable]{variant=success} after.",
  );

  assert.match(
    html,
    /<p>[\s\S]*?<span class="rb-shortcode rb-shortcode--badge">/,
  );
  assert.match(html, /rb-shortcode__badge--success">Stable/);
  assert.doesNotMatch(html, /<div/);
});

test("multiple inline shortcodes share one paragraph", async () => {
  const { html } = await createPipeline().execute(":badge[A] and :badge[B]");

  assert.equal((html.match(/<p>/g) ?? []).length, 1);
  assert.match(
    html,
    /rb-shortcode__badge--default">A[\s\S]*?rb-shortcode__badge--default">B/,
  );
});
