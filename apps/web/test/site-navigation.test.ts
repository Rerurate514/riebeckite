import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeDocsHref } from "../app/lib/navigation-link";

test("localizeDocsHref prefixes docs links on localized pages", () => {
  assert.equal(localizeDocsHref("/docs/", "/ja/docs/reference/"), "/ja/docs/");
  assert.equal(
    localizeDocsHref("/docs/themes/", "/ja/docs/reference/"),
    "/ja/docs/themes/",
  );
});

test("localizeDocsHref keeps default and non-docs links unchanged", () => {
  assert.equal(localizeDocsHref("/docs/", "/docs/reference/"), "/docs/");
  assert.equal(
    localizeDocsHref("/explore/", "/ja/docs/reference/"),
    "/explore/",
  );
  assert.equal(
    localizeDocsHref("https://github.com/Rerurate514/riebeckite", "/ja/docs/"),
    "https://github.com/Rerurate514/riebeckite",
  );
});
