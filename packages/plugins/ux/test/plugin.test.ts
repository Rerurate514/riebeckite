import assert from "node:assert/strict";
import { test } from "node:test";
import { ux } from "../index.js";
import { injectUxConfig } from "../src/inject.js";
import {
  DEFAULT_UX_CONFIG,
  resolveUxConfig,
  UX_CONFIG_ATTRIBUTE,
  UX_CONFIG_ELEMENT_ID,
} from "../src/options.js";

test("resolves defaults and normalizes the label", () => {
  assert.deepEqual(resolveUxConfig(), DEFAULT_UX_CONFIG);
  assert.deepEqual(resolveUxConfig({ progress: false, backToTopLabel: "  " }), {
    progress: false,
    backToTop: true,
    backToTopLabel: "Back to top",
  });
  assert.deepEqual(
    resolveUxConfig({
      progress: true,
      backToTop: false,
      backToTopLabel: "Up",
    }),
    { progress: true, backToTop: false, backToTopLabel: "Up" },
  );
});

test("validates options", () => {
  const plugin = ux();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      progress: "yes",
      backToTop: 0,
      backToTopLabel: " ",
    } as never),
    [
      { path: "progress", message: "Expected a boolean." },
      { path: "backToTop", message: "Expected a boolean." },
      { path: "backToTopLabel", message: "Expected a non-empty string." },
    ],
  );
  assert.deepEqual(
    plugin.validateOptions?.({
      progress: true,
      backToTop: true,
      backToTopLabel: "Top",
    }),
    [],
  );
});

test("injects the config element once", () => {
  const config = resolveUxConfig({ backToTopLabel: "Up" });
  const first = injectUxConfig("<p>body</p>", config);
  const second = injectUxConfig(first, config);

  assert.equal(second, first);
  assert.ok(
    first.startsWith(
      `<script type="application/json" id="${UX_CONFIG_ELEMENT_ID}" ${UX_CONFIG_ATTRIBUTE}>`,
    ),
  );
  assert.ok(first.endsWith("<p>body</p>"));
  assert.match(first, /"backToTopLabel":"Up"/);
});

test("escapes characters that could close the script element", () => {
  const html = injectUxConfig(
    "<p>body</p>",
    resolveUxConfig({ backToTopLabel: "</script><b>&" }),
  );

  assert.ok(!html.includes("</script><b>"));
  assert.match(html, /\\u003c\/script\\u003e\\u003cb\\u003e\\u0026/);
});

test("injects into processed content and public manifest entries", () => {
  const plugin = ux({ progress: false });
  const content = { html: "<article>one</article>" };
  const entries = [
    { html: "<article>two</article>" },
    { html: "<article>three</article>" },
  ];

  plugin.onPostProcessed?.({ content } as never);
  plugin.onManifestCreated?.({
    manifest: { publicEntries: entries },
  } as never);

  for (const html of [content.html, entries[0].html, entries[1].html]) {
    assert.ok(html.startsWith("<script"));
    assert.match(html, /"progress":false/);
  }
});
