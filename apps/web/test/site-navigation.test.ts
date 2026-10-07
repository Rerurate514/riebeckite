import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeDocsHref } from "../app/lib/navigation-link";

test("localizeDocsHref prefixes docs links on localized pages", () => {
  assert.equal(localizeDocsHref("/docs/", "/en/docs/reference/"), "/en/docs/");
  assert.equal(
    localizeDocsHref("/docs/themes/", "/en/docs/reference/"),
    "/en/docs/themes/",
  );
});

test("localizeDocsHref keeps default and non-docs links unchanged", () => {
  assert.equal(localizeDocsHref("/docs/", "/docs/reference/"), "/docs/");
  assert.equal(
    localizeDocsHref("/explore/", "/en/docs/reference/"),
    "/explore/",
  );
  assert.equal(
    localizeDocsHref("https://github.com/Rerurate514/riebeckite", "/en/docs/"),
    "https://github.com/Rerurate514/riebeckite",
  );
});
