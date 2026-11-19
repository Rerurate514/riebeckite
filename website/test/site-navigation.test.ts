import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeSiteHref } from "../app/lib/navigation-link";
import {
  getShowcaseFixtures,
  getShowcaseThemes,
  getThemeDocsHref,
} from "../app/lib/theme-showcase";

test("localizeSiteHref prefixes docs and blog links on localized pages", () => {
  assert.equal(localizeSiteHref("/docs/", "/ja/docs/reference/"), "/ja/docs/");
  assert.equal(
    localizeSiteHref("/docs/themes/", "/ja/docs/reference/"),
    "/ja/docs/themes/",
  );
  assert.equal(localizeSiteHref("/blog/", "/ja/blog/"), "/ja/blog/");
  assert.equal(
    localizeSiteHref("/blog/from-obsidian-vault/", "/ja/blog/some-post/"),
    "/ja/blog/from-obsidian-vault/",
  );
});

test("localizeSiteHref keeps default and external links unchanged", () => {
  assert.equal(localizeSiteHref("/docs/", "/docs/reference/"), "/docs/");
  assert.equal(localizeSiteHref("/blog/", "/blog/"), "/blog/");
  assert.equal(
    localizeSiteHref("https://github.com/Rerurate514/riebeckite", "/ja/docs/"),
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
