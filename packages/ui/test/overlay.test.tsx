/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AppSlot, OverlayHost } from "../overlay.js";

test("OverlayHost renders the app-owned overlay slot", () => {
  const html = renderToString(
    <OverlayHost name="text-fragment">
      <span>content</span>
    </OverlayHost>,
  );

  assert.match(html, /data-rb-overlay-host="text-fragment"/);
  assert.match(html, /<span>content<\/span>/);
});

test("AppSlot renders a named application placement", () => {
  const html = renderToString(
    <AppSlot name="bodyStart" as="section">
      <span>content</span>
    </AppSlot>,
  );

  assert.match(html, /<section data-rb-app-slot="bodyStart">/);
  assert.match(html, /<span>content<\/span>/);
});
