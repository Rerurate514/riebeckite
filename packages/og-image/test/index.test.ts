import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "hono/jsx";
import sharp from "sharp";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  presetLayout,
  renderOgImage,
} from "../index.js";

const input = {
  page: {
    title: "日本語の長い Open Graph タイトルを安全に描画する",
    permalink: "/notes/og-image",
    language: "ja",
    kind: "article",
    tags: ["Riebeckite", "画像"],
    author: "Rerurate",
  },
  site: { title: "Riebeckite" },
  palette: {
    background: "#18212f",
    foreground: "#f8fafc",
    accent: "#67e8f9",
  },
  content: { showAuthor: true, showSiteName: true, showTags: true },
} as const;

for (const preset of ["card", "minimal", "editorial"] as const) {
  test(`${preset} renders a valid PNG`, async () => {
    const image = await renderOgImage(presetLayout(preset), input);
    const metadata = await sharp(image).metadata();

    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, OG_IMAGE_WIDTH);
    assert.equal(metadata.height, OG_IMAGE_HEIGHT);
  });
}

test("Hono JSX layouts render a valid PNG", async () => {
  const image = await renderOgImage(
    () =>
      createElement(
        "div",
        {
          style: {
            color: "black",
            display: "flex",
            fontSize: 48,
          },
        },
        input.page.title,
      ),
    input,
  );
  const metadata = await sharp(image).metadata();

  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, OG_IMAGE_WIDTH);
  assert.equal(metadata.height, OG_IMAGE_HEIGHT);
});

test("legacy SVG layouts embed the Japanese font", async () => {
  const image = await renderOgImage(
    () =>
      '<text x="80" y="160" fill="white" font-size="64">日本語のカスタムレイアウト</text>',
    input,
  );
  const metadata = await sharp(image).metadata();

  assert.equal(metadata.width, OG_IMAGE_WIDTH);
  assert.equal(metadata.height, OG_IMAGE_HEIGHT);
});
