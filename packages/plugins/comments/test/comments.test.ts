import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  COMMENTS_ATTRIBUTE,
  COMMENTS_PLUGIN_NAME,
  COMMENTS_THREAD_ATTRIBUTE,
  type CommentsProvider,
  CommentsSection,
  comments,
  giscus,
} from "../index.ts";
import {
  DEFAULT_GISCUS_LANG,
  DEFAULT_GISCUS_MAPPING,
  DEFAULT_GISCUS_THEME,
  resolveGiscusOptions,
  resolveGiscusPublicConfig,
  validateGiscusOptions,
} from "../src/giscus/options.js";
import {
  DEFAULT_COMMENTS_CLASS_NAME,
  resolveCommentsOptions,
  validateCommentsOptions,
} from "../src/options.js";
import type { GiscusOptions } from "../src/types.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const giscusOptions: GiscusOptions = {
  repo: "example/site",
  repoId: "R_kgDOexample",
  category: "Comments",
  categoryId: "DIC_kwDOexample",
};

test("resolveGiscusOptions applies defaults", () => {
  const resolved = resolveGiscusOptions(giscusOptions);
  assert.equal(resolved.mapping, DEFAULT_GISCUS_MAPPING);
  assert.equal(resolved.strict, false);
  assert.equal(resolved.reactionsEnabled, true);
  assert.equal(resolved.inputPosition, "bottom");
  assert.equal(resolved.theme, DEFAULT_GISCUS_THEME);
  assert.equal(resolved.lang, DEFAULT_GISCUS_LANG);
});

test("resolveGiscusOptions keeps overrides", () => {
  const resolved = resolveGiscusOptions({
    ...giscusOptions,
    mapping: "title",
    strict: true,
    reactionsEnabled: false,
    inputPosition: "top",
    theme: "dark",
    lang: "ja",
  });
  assert.equal(resolved.mapping, "title");
  assert.equal(resolved.strict, true);
  assert.equal(resolved.reactionsEnabled, false);
  assert.equal(resolved.inputPosition, "top");
  assert.equal(resolved.theme, "dark");
  assert.equal(resolved.lang, "ja");
});

test("resolveGiscusPublicConfig serializes flags as giscus attributes", () => {
  const config = resolveGiscusPublicConfig({
    ...giscusOptions,
    strict: true,
    reactionsEnabled: false,
  });
  assert.equal(config.strict, "1");
  assert.equal(config.reactionsEnabled, "0");
});

test("validateGiscusOptions reports missing required fields", () => {
  const issues = validateGiscusOptions(undefined);
  const paths = issues.map((issue) => issue.path);
  for (const path of ["repo", "repoId", "category", "categoryId"]) {
    assert.ok(paths.includes(path), `expected an issue for ${path}`);
  }
});

test("validateGiscusOptions rejects a malformed repository", () => {
  const issues = validateGiscusOptions({ ...giscusOptions, repo: "example" });
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["repo"],
  );
});

test("validateGiscusOptions rejects unknown mapping and position", () => {
  const issues = validateGiscusOptions({
    ...giscusOptions,
    mapping: "specific",
    inputPosition: "middle",
  } as unknown as GiscusOptions);
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["mapping", "inputPosition"],
  );
});

test("validateGiscusOptions rejects non-boolean flags", () => {
  const issues = validateGiscusOptions({
    ...giscusOptions,
    strict: "yes",
  } as unknown as GiscusOptions);
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["strict"],
  );
});

test("resolveCommentsOptions applies defaults", () => {
  const resolved = resolveCommentsOptions({ provider: giscus(giscusOptions) });
  assert.equal(resolved.className, DEFAULT_COMMENTS_CLASS_NAME);
});

test("comments delegates validation to the provider", () => {
  const issues = validateCommentsOptions({
    provider: giscus({ ...giscusOptions, repo: "example" }),
  });
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["repo"],
  );
  assert.deepEqual(
    validateCommentsOptions(undefined).map((issue) => issue.path),
    ["provider"],
  );
});

test("comments registers the provider client entry and style asset", () => {
  const plugin = comments({ provider: giscus(giscusOptions) });
  assert.equal(plugin.name, COMMENTS_PLUGIN_NAME);
  const entry = plugin.clientEntries?.[0];
  assert.equal(entry?.presenceSelector, `[${COMMENTS_ATTRIBUTE}]`);
  assert.equal(entry?.moduleSpecifier, "@riebeckite/plugin-comments/client");
  assert.equal(entry?.exportName, "initGiscusComments");
  assert.equal(
    (entry?.publicConfig as { repo?: string } | undefined)?.repo,
    "example/site",
  );
  assert.ok(
    plugin.assets?.some(
      (asset) =>
        asset.kind === "style" &&
        asset.moduleSpecifier === "@riebeckite/plugin-comments/style.css",
    ),
  );
});

test("comments accepts a custom provider", () => {
  const provider: CommentsProvider = {
    name: "custom",
    client: {
      moduleSpecifier: "example-comments/client",
      exportName: "initCustomComments",
    },
    publicConfig: { thread: "42" },
  };
  const plugin = comments({ provider });
  const entry = plugin.clientEntries?.[0];
  assert.equal(entry?.moduleSpecifier, "example-comments/client");
  assert.equal(entry?.exportName, "initCustomComments");
  assert.deepEqual(entry?.publicConfig, { thread: "42" });
  assert.deepEqual(validateCommentsOptions({ provider }), []);
});

test("CommentsSection renders the provider thread container", () => {
  const html = renderToString(createElement(CommentsSection, {}));
  assert.match(html, /<section class="rr-comments" data-rr-comments/);
  assert.match(html, new RegExp(`<div[^>]*${COMMENTS_THREAD_ATTRIBUTE}[^>]*>`));
  assert.match(html, /Comments require JavaScript\./);
});

test("CommentsSection accepts a custom class", () => {
  const html = renderToString(
    createElement(CommentsSection, { className: "site-comments" }),
  );
  assert.match(html, /class="site-comments"/);
});
