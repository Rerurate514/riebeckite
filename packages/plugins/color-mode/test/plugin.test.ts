import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import ColorModeScript from "../components/color-mode-script.js";
import { COLOR_MODE_STORAGE_KEY } from "../src/constants.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

test("applies the persisted color mode before paint", () => {
  const html = renderToString(createElement(ColorModeScript, {}));

  assert.match(html, /data-rb-color-mode","ready"/);
  assert.ok(html.includes(JSON.stringify(COLOR_MODE_STORAGE_KEY)));
  assert.match(html, /data-rb-mode/);
});
