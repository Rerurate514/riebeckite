import assert from "node:assert/strict";
import { test } from "node:test";
import {
  builtinShortcodeNames,
  createShortcodeRenderContext,
  DEFAULT_SHORTCODE_CLASS_NAME,
  renderShortcode,
  resolveShortcodeOptions,
  SHORTCODE_CHILDREN_MARKER,
} from "../index.ts";

test("resolveShortcodeOptions applies defaults and registers builtins", () => {
  const resolved = resolveShortcodeOptions();

  assert.equal(resolved.className, DEFAULT_SHORTCODE_CLASS_NAME);
  assert.equal(resolved.builtins, true);
  assert.equal(resolved.language, undefined);
  assert.equal(typeof resolved.shortcodes.badge, "function");
  assert.ok(builtinShortcodeNames.includes("link-card"));
});

test("resolveShortcodeOptions can disable builtins and keep custom ones", () => {
  const custom = () => "custom";
  const resolved = resolveShortcodeOptions({
    builtins: false,
    shortcodes: { custom },
  });

  assert.equal(resolved.builtins, false);
  assert.equal(resolved.shortcodes.custom, custom);
  assert.equal(resolved.shortcodes.badge, undefined);
  assert.equal(renderShortcode({ name: "badge" }, resolved), "");
});

test("custom renderers override builtins by name", () => {
  const resolved = resolveShortcodeOptions({
    shortcodes: { badge: () => "RAW" },
  });

  assert.equal(
    renderShortcode({ name: "badge" }, resolved),
    '<span class="rb-shortcode rb-shortcode--badge">RAW</span>',
  );
});

test("renderShortcode returns an empty string for unknown names", () => {
  assert.equal(
    renderShortcode({ name: "missing" }, resolveShortcodeOptions()),
    "",
  );
});

test("renderShortcode escapes the wrapper className and language", () => {
  const resolved = resolveShortcodeOptions({
    className: 'x"y',
    language: "ja",
  });

  assert.equal(
    renderShortcode({ name: "badge", label: "Hi" }, resolved),
    '<span class="x&quot;y x&quot;y--badge" lang="ja">' +
      '<span class="rb-shortcode__badge rb-shortcode__badge--default">Hi' +
      "</span></span>",
  );
});

test("builtins normalize variant tokens and split kbd keys", () => {
  const resolved = resolveShortcodeOptions();

  assert.equal(
    renderShortcode(
      { name: "badge", label: "New", attributes: { variant: "Very Cool!" } },
      resolved,
    ),
    '<span class="rb-shortcode rb-shortcode--badge">' +
      '<span class="rb-shortcode__badge rb-shortcode__badge--very-cool">New' +
      "</span></span>",
  );

  assert.equal(
    renderShortcode({ name: "kbd", label: "Ctrl++K" }, resolved),
    '<span class="rb-shortcode rb-shortcode--kbd">' +
      '<kbd class="rb-shortcode__kbd">Ctrl</kbd>' +
      '<span class="rb-shortcode__kbd-separator">+</span>' +
      '<kbd class="rb-shortcode__kbd">K</kbd></span>',
  );
});

test("figure falls back without a source and escapes its attributes", () => {
  const resolved = resolveShortcodeOptions();

  assert.equal(
    renderShortcode({ name: "figure", label: "Figure X" }, resolved),
    '<span class="rb-shortcode rb-shortcode--figure">' +
      '<span class="rb-shortcode__figure-fallback">Figure X</span></span>',
  );

  const html = renderShortcode(
    {
      name: "figure",
      attributes: { src: '/a?x=<y>&"z"', caption: "A & B", width: "10" },
    },
    resolved,
  );

  assert.ok(html.includes('src="/a?x=&lt;y&gt;&amp;&quot;z&quot;"'));
  assert.ok(html.includes('alt="A &amp; B"'));
  assert.ok(html.includes('width="10"'));
  assert.ok(html.includes("A &amp; B</figcaption>"));
});

test("container renderers render a div and receive the children marker", () => {
  const resolved = resolveShortcodeOptions({
    shortcodes: {
      box: (input) => `<div>${input.childrenHtml ?? ""}</div>`,
    },
  });
  const html = renderShortcode(
    {
      name: "box",
      container: true,
      childrenHtml: SHORTCODE_CHILDREN_MARKER,
      context: createShortcodeRenderContext({ name: "box" }),
    },
    resolved,
  );

  assert.equal(
    html,
    '<div class="rb-shortcode rb-shortcode--box">' +
      `<div>${SHORTCODE_CHILDREN_MARKER}</div></div>`,
  );
});
