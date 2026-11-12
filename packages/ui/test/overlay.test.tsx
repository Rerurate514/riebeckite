/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { OverlayHost } from "../overlay.js";

test("OverlayHost renders the app-owned overlay slot", () => {
  const html = renderToString(
    <OverlayHost name="text-fragment">
      <span>content</span>
    </OverlayHost>,
  );

  assert.match(html, /data-rb-overlay-host="text-fragment"/);
  assert.match(html, /<span>content<\/span>/);
});
