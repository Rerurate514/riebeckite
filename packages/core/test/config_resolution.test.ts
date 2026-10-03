import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isExcluded,
  resolveConfig,
  resolveConfigModule,
} from "../src/config.js";
import { ConfigValidationError } from "../src/config_validation.js";
import { definePlugin } from "../src/types/plugin.js";
import type { RiebeckiteConfig } from "../src/types/riebeckite_config.js";
import type { ThemeAttributes } from "../src/types/theme_config.js";
import { defineTheme } from "../src/types/theme_config.js";

test("resolveConfig fills documented defaults", () => {
  const config = resolveConfig({ site: { title: "My Site" } });

  assert.deepEqual(config.site, {
    title: "My Site",
    description: "",
    author: "",
    baseUrl: "",
    locale: "en",
    twitterSite: "",
    defaultOgImage: "",
    feed: { title: "My Site", description: "", language: "en" },
  });
  assert.equal(config.content.directory, "../../content");
  assert.equal(config.content.filters.publishStrategy, "explicit");
  assert.equal(config.markdown.syntaxHighlight.theme, "");
  assert.deepEqual(config.theme, {
    name: "riebeckite",
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    tokens: {},
    attributes: {},
    userCss: [],
    styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
  });
  assert.deepEqual(config.plugins, []);
  assert.deepEqual(config.navigation, { header: [], footer: [] });
});

test("resolveConfig retains authored navigation", () => {
  const config = resolveConfig({
    site: { title: "My Site" },
    navigation: {
      header: [
        {
          label: "Docs",
          href: "/docs",
          children: [{ label: "Guide", href: "/docs/guide" }],
        },
      ],
      footer: [
        { label: "GitHub", href: "https://github.com/example", external: true },
      ],
    },
  });

  assert.deepEqual(config.navigation, {
    header: [
      {
        label: "Docs",
        href: "/docs",
        children: [{ label: "Guide", href: "/docs/guide" }],
      },
    ],
    footer: [
      { label: "GitHub", href: "https://github.com/example", external: true },
    ],
  });
});

test("resolveConfig rejects malformed authored navigation", () => {
  const recursive: { label: string; href: string; children?: unknown[] } = {
    label: "Docs",
    href: "/docs",
  };
  recursive.children = [recursive];

  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        navigation: {
          header: [
            { label: "", href: "" },
            { label: "External", href: "/external", external: "yes" },
            recursive,
          ],
          footer: "footer",
        },
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        [
          "navigation.header[0].label",
          "navigation.header[0].href",
          "navigation.header[1].external",
          "navigation.header[2].children[0]",
          "navigation.footer",
        ],
      );
      return true;
    },
  );
});

test("resolveConfig merges theme config and sanitizes theme attributes", () => {
  const config = resolveConfig({
    site: {
      title: "Site",
      description: "Site description",
      locale: "ja",
      feed: { title: "Feed title", language: "ja-JP" },
    },
    theme: defineTheme({
      name: "custom",
      styles: [{ moduleSpecifier: "@example/theme.css" }],
      config: {
        colorMode: "dark",
        typography: "serif",
        articleLayout: "sidebar",
        attributes: {
          "data-brand": "from-config",
          "data-theme": "reserved",
          "aria-label": "not-a-data-attribute",
        } as ThemeAttributes,
      },
      attributes: { "data-brand": "from-theme", "data-density": "compact" },
    }),
  });

  assert.equal(config.site.feed.title, "Feed title");
  assert.equal(config.site.feed.description, "Site description");
  assert.equal(config.site.feed.language, "ja-JP");
  assert.equal(config.theme.name, "custom");
  assert.equal(config.theme.colorMode, "dark");
  assert.equal(config.theme.typography, "serif");
  assert.equal(config.theme.articleLayout, "sidebar");
  assert.deepEqual(config.theme.styles, [
    { moduleSpecifier: "@example/theme.css" },
  ]);
  assert.deepEqual(config.theme.attributes, {
    "data-brand": "from-theme",
    "data-density": "compact",
  });
});

test("resolveConfig rejects invalid theme presets and styles", () => {
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        theme: {
          colorMode: "blue",
          typography: "comic",
          articleLayout: "wide",
          styles: [{ moduleSpecifier: "" }],
        },
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        [
          "theme.colorMode",
          "theme.typography",
          "theme.articleLayout",
          "theme.styles[0].moduleSpecifier",
        ],
      );
      assert.equal(
        error.issues[0]?.message,
        "Expected one of: light, dark, system.",
      );
      return true;
    },
  );
});

test("resolveConfig rejects a bad publish strategy and non-HTTP base URL", () => {
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site", baseUrl: "ftp://example.com" },
        content: { filters: { publishStrategy: "sometimes" } },
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        ["site.baseUrl", "content.filters.publishStrategy"],
      );
      return true;
    },
  );
});

test("resolveConfig reports plugin name, duplicate, and option issues", () => {
  const optionPlugin = definePlugin<{ token?: string }>({
    name: "example",
    options: { token: "" },
    validateOptions: (options) =>
      options?.token ? [] : [{ path: "token", message: "Expected a token." }],
  });
  const throwingPlugin = definePlugin({
    name: "boom",
    validateOptions: () => {
      throw new Error("kaboom");
    },
  });

  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        plugins: [
          { name: "dup" },
          { name: "dup" },
          optionPlugin,
          throwingPlugin,
          { name: "" },
        ],
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        [
          "plugins[1].name",
          "plugins[2].options.token",
          "plugins[3].options",
          "plugins[4].name",
        ],
      );
      assert.match(
        error.issues[0]?.message ?? "",
        /Duplicate plugin name "dup"/,
      );
      assert.match(error.issues[2]?.message ?? "", /Validator failed: kaboom/);
      assert.match(error.message, /Invalid Riebeckite configuration:/);
      return true;
    },
  );
});

test("resolveConfigModule unwraps default export wrappers", () => {
  const resolved = resolveConfigModule({
    __esModule: true,
    default: { default: { site: { title: "Wrapped" } } },
  });

  assert.equal(resolved.site.title, "Wrapped");
});

test("isExcluded matches glob patterns against normalized paths", () => {
  assert.equal(isExcluded(["**/draft/**"], "notes/draft/idea.md"), true);
  assert.equal(isExcluded(["**/draft/**"], "notes/draft.md"), false);
  assert.equal(isExcluded(["*.md"], "note.md"), true);
  assert.equal(isExcluded(["*.md"], "nested/note.md"), false);
  assert.equal(isExcluded(["file-?.md"], "file-a.md"), true);
  assert.equal(isExcluded(["file-?.md"], "file-ab.md"), false);
  assert.equal(isExcluded(["draft/**"], "draft\\idea.md"), true);
  assert.equal(isExcluded(["a+b[c].md"], "a+b[c].md"), true);
  assert.equal(isExcluded(["a+b[c].md"], "aabcc.md"), false);
});
