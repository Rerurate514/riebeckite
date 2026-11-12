import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { LightboxDialog } from "../src/dialog.tsx";

test("LightboxDialog renders the dialog, loading state, and close button", () => {
  const html = renderToString(
    LightboxDialog({ expandLabel: "Expand image", closeLabel: "Close" }),
  );

  assert.match(html, /<dialog class="rr-lightbox" aria-label="Expand image">/);
  assert.match(
    html,
    /<figure class="rr-lightbox__frame" data-loading-content=""/,
  );
  assert.match(html, /<img class="rr-lightbox__image" decoding="async" alt=""/);
  assert.match(html, /<figcaption class="rr-lightbox__caption"><\/figcaption>/);
  assert.match(
    html,
    /<p class="rr-lightbox__status" data-loading="" role="status" aria-live="polite" hidden="">Loading image…<\/p>/,
  );
  assert.match(
    html,
    /<p class="rr-lightbox__error" data-loading-error="" role="alert" hidden=""><\/p>/,
  );
  assert.match(
    html,
    /<button class="rr-lightbox__close" type="button" aria-label="Close">×<\/button>/,
  );
});
