import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "../../../../tests/helpers/golden.ts";
import { highlightPlugin } from "../index.ts";

test("golden: highlights render through the markdown pipeline", async () => {
  const markdown = [
    "Some ==highlight== text and ==a & b== more.",
    "",
    "`==not==` stays inline code and ==  == stays empty.",
  ].join("\n");

  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [highlightPlugin({ className: "hl", tag: "span" })],
  });
  const { html } = await pipeline.execute(markdown);

  assertGolden(html, new URL("./__golden__/highlight.html", import.meta.url));
});
