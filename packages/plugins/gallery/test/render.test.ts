import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGallery, renderGalleryError } from "../index.ts";

test("renders a linked card grid", () => {
  const html = renderGallery({
    columns: 3,
    aspect: "4/3",
    items: [
      {
        title: "Default",
        description: "A calm baseline.",
        image: "/themes/default.png",
        href: "/themes/default",
        meta: "v0.1.0",
      },
    ],
  });

  assert.equal(
    html,
    [
      '<div class="rr-gallery" data-rr-gallery style="--rr-gallery-columns:3;--rr-gallery-aspect:4/3">',
      '<ul class="rr-gallery__items">',
      '<li class="rr-gallery__item">',
      '<a class="rr-gallery__card" href="/themes/default">',
      '<img class="rr-gallery__image" src="/themes/default.png" alt="Default" loading="lazy" decoding="async">',
      '<span class="rr-gallery__body">',
      '<span class="rr-gallery__title">Default</span>',
      '<span class="rr-gallery__description">A calm baseline.</span>',
      '<span class="rr-gallery__meta">v0.1.0</span>',
      "</span>",
      "</a>",
      "</li>",
      "</ul>",
      "</div>",
    ].join(""),
  );
});

test("renders a non-link text card without an image", () => {
  const html = renderGallery({
    columns: 1,
    aspect: "1",
    items: [{ title: "Plain" }],
  });

  assert.ok(
    html.includes(
      '<div class="rr-gallery__card"><span class="rr-gallery__body"><span class="rr-gallery__title">Plain</span></span></div>',
    ),
  );
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<a "));
});

test("defaults alt to the title and escapes all values", () => {
  const html = renderGallery({
    columns: 3,
    aspect: "4/3",
    items: [
      {
        title: "A & B",
        image: "/x.png?y=1&z=2",
        href: "/a?b=1&c=2",
      },
    ],
  });

  assert.ok(html.includes('alt="A &amp; B"'));
  assert.ok(html.includes('src="/x.png?y=1&amp;z=2"'));
  assert.ok(html.includes('href="/a?b=1&amp;c=2"'));
});

test("emits an empty alt when no title or alt is available", () => {
  const html = renderGallery({
    columns: 3,
    aspect: "4/3",
    items: [{ image: "/only.png" }],
  });

  assert.ok(html.includes('alt=""'));
});

test("renders an error box with an escaped message", () => {
  const html = renderGalleryError('Bad <block> & "quotes"');

  assert.ok(html.includes('class="rr-gallery rr-gallery--error"'));
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes("Bad &lt;block&gt; &amp; &quot;quotes&quot;"));
});
