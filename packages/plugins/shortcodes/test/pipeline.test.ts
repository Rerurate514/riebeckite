import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "../../../../tests/helpers/golden.ts";
import { shortcodesPlugin } from "../index.ts";

function createPipeline(): Pipeline {
  return new Pipeline(new Map(), new Map(), undefined, {
    plugins: [shortcodesPlugin()],
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
