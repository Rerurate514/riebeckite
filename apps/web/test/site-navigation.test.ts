import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeDocsHref } from "../app/lib/navigation-link";
import { getThemeDocsHref } from "../app/lib/theme-showcase";

test("localizeDocsHref prefixes docs links on localized pages", () => {
  assert.equal(localizeDocsHref("/docs/", "/ja/docs/reference/"), "/ja/docs/");
  assert.equal(
    localizeDocsHref("/docs/themes/", "/ja/docs/reference/"),
    "/ja/docs/themes/",
  );
});

test("localizeDocsHref keeps default and external links unchanged", () => {
  assert.equal(localizeDocsHref("/docs/", "/docs/reference/"), "/docs/");
  assert.equal(
    localizeDocsHref("https://github.com/Rerurate514/riebeckite", "/ja/docs/"),
    "https://github.com/Rerurate514/riebeckite",
  );
});

test("theme documentation links use the localized documentation route", () => {
  assert.equal(getThemeDocsHref("riebeckite", "en"), "/docs/themes/default");
  assert.equal(getThemeDocsHref("garden", "ja"), "/ja/docs/themes/garden");
});
