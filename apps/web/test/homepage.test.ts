import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderToString } from "hono/jsx/dom/server";
import HomePage from "../app/components/home/home";
import {
  buildSoftwareApplicationSchema,
  getHomeCopy,
  getHomePath,
  type HomeLocale,
} from "../app/lib/home";
import { getHreflangAlternates, toOgLocale } from "../app/lib/locale";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const locales: HomeLocale[] = ["ja", "en"];

test("homepage titles name the software and its content sources", () => {
  for (const locale of locales) {
    const copy = getHomeCopy(locale);
    assert.match(copy.title, /Riebeckite/);
    assert.match(copy.title, /Markdown/);
    assert.match(copy.title, /Obsidian/);
    assert.ok(copy.description.length > 0);
    assert.ok(copy.primaryCta.href.length > 0);
  }
});

test("homepage copy avoids unsupported marketing claims", () => {
  const forbidden =
    /revolutionary|next-generation|blazing|seamless|effortless|enterprise-grade|10x|anything you can imagine|100% obsidian|\bfast\b|高速/i;
  for (const locale of locales) {
    const copy = JSON.stringify(getHomeCopy(locale));
    assert.doesNotMatch(copy, forbidden);
  }
});

test("site metadata and homepage sources avoid performance claims", () => {
  const forbidden = /\bfast\b|高速/i;
  assert.doesNotMatch(read("../../../riebeckite.config.ts"), forbidden);
  for (const file of ["../../../docs/index.md", "../../../docs/index.ja.md"]) {
    assert.doesNotMatch(read(file), forbidden);
  }
});

test("homepage canonical paths follow locale routing", () => {
  assert.equal(getHomePath("ja"), "/ja/");
  assert.equal(getHomePath("en"), "/");
});

test("homepage SEO copy is localized rather than translated verbatim", () => {
  const ja = getHomeCopy("ja");
  const en = getHomeCopy("en");
  assert.notEqual(ja.title, en.title);
  assert.notEqual(ja.description, en.description);
  assert.match(ja.title, /フレームワーク/);
  assert.match(en.title, /Framework/);
});

test("software structured data is factual and localized", () => {
  const en = buildSoftwareApplicationSchema("en", "https://riebeckite.dev/");
  assert.equal(en["@type"], "SoftwareApplication");
  assert.equal(en["@context"], "https://schema.org");
  assert.equal(en.name, "Riebeckite");
  assert.equal(en.applicationCategory, "DeveloperApplication");
  assert.equal("operatingSystem" in en, false);
  assert.equal(en.codeRepository, "https://github.com/Rerurate514/riebeckite");
  assert.equal(en.license, "https://www.apache.org/licenses/LICENSE-2.0");
  assert.equal(en.inLanguage, "en-US");
  assert.equal(en.url, "https://riebeckite.dev/");

  for (const key of [
    "aggregateRating",
    "review",
    "reviews",
    "offers",
    "author",
  ]) {
    assert.equal(key in en, false, `unexpected key: ${key}`);
  }

  const ja = buildSoftwareApplicationSchema("ja", "https://riebeckite.dev/ja/");
  assert.equal(ja.inLanguage, "ja-JP");
});

test("og locale helpers derive from hreflang alternates", () => {
  assert.equal(toOgLocale("ja"), "ja_JP");
  assert.equal(toOgLocale("ja_JP"), "ja_JP");
  assert.equal(toOgLocale("en"), "en_US");
  assert.equal(toOgLocale(undefined), "en_US");

  const alternates = getHreflangAlternates([
    { tag: "link", attrs: { rel: "alternate", hreflang: "ja", href: "/ja/" } },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "en", href: "/" },
    },
    { tag: "link", attrs: { rel: "alternate", hreflang: "ja", href: "/ja/" } },
    { tag: "meta", attrs: { rel: "alternate", hreflang: "fr" } },
  ]);
  assert.deepEqual(alternates.sort(), ["en", "ja"]);
});

for (const locale of locales) {
  test(`homepage (${locale}) exposes one main landmark and a single h1`, () => {
    const html = renderToString(HomePage({ locale }));

    assert.equal((html.match(/<main\b/g) ?? []).length, 1);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((html.match(/<h2\b/g) ?? []).length, 7);
    assert.match(html, /<h1[^>]*id="home-title"/);

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, "ids must be unique");

    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.ok(labelled.length >= 7);
    for (const id of labelled) {
      assert.ok(ids.includes(id), `aria-labelledby target is missing: ${id}`);
    }

    assert.ok(
      html.indexOf("<h1") < html.indexOf("<h2"),
      "the h1 must precede the section headings",
    );
  });

  test(`homepage (${locale}) links the journeys a first-time visitor needs`, () => {
    const html = renderToString(HomePage({ locale }));
    const copy = getHomeCopy(locale);
    const docsPrefix = locale === "en" ? "" : "/ja";

    for (const href of [
      copy.primaryCta.href,
      `${docsPrefix}/docs/`,
      `${docsPrefix}/docs/getting-started/`,
      `${docsPrefix}/docs/plugins/`,
      `${docsPrefix}/docs/themes/`,
      "https://github.com/Rerurate514/riebeckite",
    ]) {
      assert.ok(html.includes(`href="${href}"`), `missing link: ${href}`);
    }

    assert.ok(html.includes('hreflang="en"') || html.includes('hreflang="ja"'));
    assert.ok(html.includes('lang="en"') || html.includes('lang="ja"'));
  });
}

test("both homepage sources are paired for hreflang", () => {
  for (const file of ["../../../docs/index.md", "../../../docs/index.ja.md"]) {
    const source = read(file);
    assert.match(source, /^translation: home$/m);
    assert.match(source, /^homepage: true$/m);
  }
});

test("site identity names the software project", () => {
  const configSource = read("../../../riebeckite.config.ts");
  assert.match(configSource, /title: "Riebeckite"/);
});
