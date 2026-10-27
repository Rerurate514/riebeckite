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
import {
  defineTheme,
  ThemeSettingsValidationError,
} from "../src/types/theme_config.js";

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
  assert.equal(config.content.directory, "content");
  assert.equal(config.content.filters.publishStrategy, "explicit");
  assert.deepEqual(config.theme, {
    name: "riebeckite",
    colorMode: "system",
    layout: "article",
    stylesheets: [],
    settings: { values: {}, attributes: {}, style: "" },
    styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
  });
  assert.deepEqual(config.plugins, []);
});

test("resolveConfig normalizes the SPA switch", () => {
  assert.deepEqual(
    resolveConfig({ site: { title: "My Site" }, spa: true }).spa,
    {},
  );
  assert.equal(
    resolveConfig({ site: { title: "My Site" }, spa: false }).spa,
    undefined,
  );
  assert.equal(resolveConfig({ site: { title: "My Site" } }).spa, undefined);
});

test("resolveConfig rejects an invalid SPA value", () => {
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        spa: "yes",
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        ["spa"],
      );
      return true;
    },
  );
});

test("resolveConfig resolves theme settings and presets", () => {
  const theme = defineTheme({
    name: "custom",
    styles: [{ moduleSpecifier: "@example/theme.css" }],
    settings: {
      accent: { type: "color", label: "Accent", default: "#112233" },
      density: {
        type: "select",
        label: "Density",
        default: "comfortable",
        options: [
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ],
      },
    },
    presets: {
      compact: { label: "Compact", settings: { density: "compact" } },
    },
  });
  const config = resolveConfig({
    site: {
      title: "Site",
      description: "Site description",
      locale: "ja",
      feed: { title: "Feed title", language: "ja-JP" },
    },
    theme: theme({ colorMode: "dark", layout: "sidebar", preset: "compact" }),
  });

  assert.equal(config.site.feed.title, "Feed title");
  assert.equal(config.site.feed.description, "Site description");
  assert.equal(config.site.feed.language, "ja-JP");
  assert.equal(config.theme.name, "custom");
  assert.equal(config.theme.colorMode, "dark");
  assert.equal(config.theme.layout, "sidebar");
  assert.deepEqual(config.theme.styles, [
    { moduleSpecifier: "@example/theme.css" },
  ]);
  assert.equal(config.theme.settings.values.density, "compact");
  assert.equal(
    config.theme.settings.attributes["data-rb-setting-density"],
    "compact",
  );
});

test("resolveConfig rejects invalid theme instances", () => {
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        theme: { name: "invalid" },
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        ["theme"],
      );
      assert.equal(error.issues[0]?.message, "Expected a theme instance.");
      return true;
    },
  );
});

test("resolveConfig rejects unknown and unsafe theme settings", () => {
  const theme = defineTheme({
    name: "custom",
    styles: [],
    settings: {
      accent: { type: "color", label: "Accent", default: "#112233" },
    },
  });

  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        theme: theme({ settings: { accent: "red" } }),
      }),
    ThemeSettingsValidationError,
  );
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        theme: theme({ settings: { unknown: "value" } as never }),
      }),
    ThemeSettingsValidationError,
  );
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        theme: theme({ settings: { toString: "value" } as never }),
      }),
    ThemeSettingsValidationError,
  );
  assert.throws(
    () =>
      defineTheme({
        name: "custom",
        styles: [],
        settings: {
          "accent; color: red": {
            type: "color",
            label: "Accent",
            default: "#112233",
          },
        },
      }),
    ThemeSettingsValidationError,
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

test("resolveConfig rejects an invalid cache section", () => {
  assert.throws(
    () =>
      resolveConfig({
        site: { title: "Site" },
        cache: { enabled: "yes", directory: 42 },
      } as unknown as RiebeckiteConfig),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        ["cache.enabled", "cache.directory"],
      );
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
