import assert from "node:assert/strict";
import test from "node:test";
import { resolveConfig } from "@riebeckite/core";
import { resolveHonoxConfig } from "../src/resolved_config.js";
import {
  inspectSpaPage,
  SPA_DIAGNOSTICS_PLUGIN_NAME,
  spaDiagnostics,
} from "../src/spa_diagnostics.js";

test("inspectSpaPage reports error when main-content is missing", () => {
  const diagnostics = inspectSpaPage({
    path: "about/index.html",
    html: "<html><body><p>hello</p></body></html>",
  });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].severity, "error");
  assert.equal(diagnostics[0].code, "spa-missing-main-content");
  assert.equal(diagnostics[0].filePath, "about/index.html");
});

test("inspectSpaPage accepts main with main-content id", () => {
  const html =
    '<html><body><main id="main-content" tabindex="-1">x</main></body></html>';
  assert.deepEqual(inspectSpaPage({ path: "index.html", html }), []);
});

test("inspectSpaPage accepts main with attributes before id", () => {
  const html = '<main class="site-main" id="main-content">x</main>';
  assert.deepEqual(inspectSpaPage({ path: "index.html", html }), []);
});

test("inspectSpaPage skips redirect pages", () => {
  const html =
    '<html><head><meta http-equiv="refresh" content="0; url=/new/"></head><body></body></html>';
  assert.deepEqual(inspectSpaPage({ path: "old/index.html", html }), []);
});

test("spaDiagnostics plugin exposes inspectGeneratedHtml", () => {
  const plugin = spaDiagnostics();
  assert.equal(plugin.name, SPA_DIAGNOSTICS_PLUGIN_NAME);
  assert.equal(typeof plugin.inspectGeneratedHtml, "function");
});

test("resolveHonoxConfig adds the plugin only when spa is enabled", () => {
  const base = resolveConfig({ site: { title: "Test" } });

  const withoutSpa = resolveHonoxConfig(base, "/site");
  assert.equal(
    withoutSpa.plugins.some((p) => p.name === SPA_DIAGNOSTICS_PLUGIN_NAME),
    false,
  );

  const withSpa = resolveHonoxConfig({ ...base, spa: {} }, "/site");
  assert.equal(
    withSpa.plugins.some((p) => p.name === SPA_DIAGNOSTICS_PLUGIN_NAME),
    true,
  );
});
