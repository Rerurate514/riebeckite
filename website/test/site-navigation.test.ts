import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeDocsHref } from "../app/lib/navigation-link";
import {
  getShowcaseFixtures,
  getShowcaseThemes,
  getThemeDocsHref,
} from "../app/lib/theme-showcase";

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

test("Japanese theme showcase content is localized", () => {
  assert.match(getShowcaseThemes("ja")[0].description, /基本テーマ/);
  assert.equal(getShowcaseFixtures("ja")[0].title, "記事");
  assert.match(getShowcaseFixtures("ja")[0].markdown, /考え抜かれた/);
  assert.equal(
    getShowcaseFixtures("ja")[1].pages?.[0].title,
    "テーマについての観察",
  );
});
