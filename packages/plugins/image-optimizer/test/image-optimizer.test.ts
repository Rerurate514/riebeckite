import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, type ContentSource } from "@riebeckite/core";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import sharp from "sharp";
import { imageOptimizer, resolveImageOptimizerOptions } from "../index.ts";

test("creates WebP and AVIF variants for a public image", async () => {
  const input = await sharp({
    create: { width: 1000, height: 500, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![image](images/photo.png)",
      "images/photo.png": input,
    }),
    [],
    {
      plugins: [
        imageOptimizer({ widths: [640, 1280] }),
        responsiveImage({ widths: [640], formats: ["webp", "avif"] }),
      ],
    },
  ).getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path),
    ["images/photo-640.avif", "images/photo-640.webp", "images/photo.png"],
  );
  assert.match(manifest.publicEntries[0]?.html ?? "", /photo-640\.webp 640w/);
  for (const output of manifest.generatedOutputs.slice(0, 2)) {
    const metadata = await sharp(output.content as Uint8Array).metadata();
    assert.equal(metadata.width, 640);
  }
  assert.deepEqual(
    manifest.publicEntries[0]?.assets.map((asset) => asset.path),
    ["images/photo.png", "images/photo-640.webp", "images/photo-640.avif"],
  );
});

test("normalizes image optimizer options", () => {
  assert.deepEqual(resolveImageOptimizerOptions({ widths: [640, 0, 640] }), {
    widths: [640],
    formats: ["webp", "avif"],
    quality: 80,
    keepMetadata: false,
    maxInputBytes: 52_428_800,
  });
});

function source(files: Record<string, string | Uint8Array>): ContentSource {
  return {
    async scan() {
      return Object.entries(files).map(([path, content]) => ({
        path,
        metadata:
          typeof content === "string"
            ? undefined
            : { size: content.byteLength },
      }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}
