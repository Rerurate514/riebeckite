import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import { codeAnnotationsPlugin } from "../index.ts";

test("golden: annotated code renders through the markdown pipeline", async () => {
  const fence = "```";
  const markdown = [
    `${fence}ts {1,3-4} focus:{2}`,
    "const a = 1; // [!code ++]",
    "const b = 2; // [!code --]",
    "const c = 3; // [!code focus]",
    "const d = 4;",
    fence,
  ].join("\n");

  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [codeAnnotationsPlugin()],
  });
  const { html } = await pipeline.execute(markdown);

  assertGolden(
    html,
    new URL("./__golden__/annotated_code.html", import.meta.url),
  );
});
