import assert from "node:assert/strict";
import { test } from "node:test";
import { extractMarkdownLinkUrls } from "../src/content/content_links.js";

test("extracts Markdown link URLs with parser-normalized entities", () => {
  const urls = extractMarkdownLinkUrls(
    [
      "[ordinary](/en/target?view=full#section)",
      "[entity](&sol;en&sol;target)",
      "[encoded](%2Fen%2Ftarget)",
      "[Japanese](/日本語)",
      "![image](/assets/image.png)",
      "",
      "[target]: /en/reference",
    ].join("\n"),
  );

  assert.deepEqual(urls, [
    "/en/target?view=full#section",
    "/en/target",
    "%2Fen%2Ftarget",
    "/日本語",
  ]);
});
