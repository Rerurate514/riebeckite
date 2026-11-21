import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  COMMENTS_ATTRIBUTE,
  COMMENTS_PLUGIN_NAME,
  CommentsSection,
  comments,
  GISCUS_CONTAINER_CLASS,
} from "../index.ts";
import {
  DEFAULT_COMMENTS_CLASS_NAME,
  DEFAULT_GISCUS_LANG,
  DEFAULT_GISCUS_MAPPING,
  DEFAULT_GISCUS_THEME,
  resolveCommentsOptions,
  resolveCommentsPublicConfig,
  validateCommentsOptions,
} from "../src/options.js";
import type { CommentsOptions } from "../src/types.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const baseOptions: CommentsOptions = {
  repo: "example/site",
  repoId: "R_kgDOexample",
  category: "Comments",
  categoryId: "DIC_kwDOexample",
};

test("resolveCommentsOptions applies defaults", () => {
  const resolved = resolveCommentsOptions(baseOptions);
  assert.equal(resolved.mapping, DEFAULT_GISCUS_MAPPING);
  assert.equal(resolved.strict, false);
  assert.equal(resolved.reactionsEnabled, true);
  assert.equal(resolved.inputPosition, "bottom");
  assert.equal(resolved.theme, DEFAULT_GISCUS_THEME);
  assert.equal(resolved.lang, DEFAULT_GISCUS_LANG);
  assert.equal(resolved.className, DEFAULT_COMMENTS_CLASS_NAME);
});

test("resolveCommentsOptions keeps overrides", () => {
  const resolved = resolveCommentsOptions({
    ...baseOptions,
    mapping: "title",
    strict: true,
    reactionsEnabled: false,
    inputPosition: "top",
    theme: "dark",
    lang: "ja",
    className: "site-comments",
  });
  assert.equal(resolved.mapping, "title");
  assert.equal(resolved.strict, true);
  assert.equal(resolved.reactionsEnabled, false);
  assert.equal(resolved.inputPosition, "top");
  assert.equal(resolved.theme, "dark");
  assert.equal(resolved.lang, "ja");
  assert.equal(resolved.className, "site-comments");
});

test("resolveCommentsPublicConfig serializes flags as giscus attributes", () => {
  const config = resolveCommentsPublicConfig({
    ...baseOptions,
    strict: true,
    reactionsEnabled: false,
  });
  assert.equal(config.strict, "1");
  assert.equal(config.reactionsEnabled, "0");
});

test("validateCommentsOptions reports missing required fields", () => {
  const issues = validateCommentsOptions(undefined);
  const paths = issues.map((issue) => issue.path);
  for (const path of ["repo", "repoId", "category", "categoryId"]) {
    assert.ok(paths.includes(path), `expected an issue for ${path}`);
  }
});

test("validateCommentsOptions rejects a malformed repository", () => {
  const issues = validateCommentsOptions({ ...baseOptions, repo: "example" });
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["repo"],
  );
});

test("validateCommentsOptions rejects unknown mapping and position", () => {
  const issues = validateCommentsOptions({
    ...baseOptions,
    mapping: "specific",
    inputPosition: "middle",
  } as unknown as CommentsOptions);
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["mapping", "inputPosition"],
  );
});

test("validateCommentsOptions rejects non-boolean flags", () => {
  const issues = validateCommentsOptions({
    ...baseOptions,
    strict: "yes",
  } as unknown as CommentsOptions);
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["strict"],
  );
});

test("comments registers the client entry and style asset", () => {
  const plugin = comments(baseOptions);
  assert.equal(plugin.name, COMMENTS_PLUGIN_NAME);
  const entry = plugin.clientEntries?.[0];
  assert.equal(entry?.presenceSelector, `[${COMMENTS_ATTRIBUTE}]`);
  assert.equal(entry?.moduleSpecifier, "@riebeckite/plugin-comments/client");
  assert.equal(entry?.exportName, "initComments");
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

test("CommentsSection renders the giscus container", () => {
  const html = renderToString(createElement(CommentsSection, {}));
  assert.match(html, /<section class="rr-comments" data-rr-comments/);
  assert.match(
    html,
    new RegExp(`<div class="${GISCUS_CONTAINER_CLASS}"></div>`),
  );
  assert.match(html, /Comments require JavaScript\./);
});

test("CommentsSection accepts a custom class", () => {
  const html = renderToString(
    createElement(CommentsSection, { className: "site-comments" }),
  );
  assert.match(html, /class="site-comments"/);
});
