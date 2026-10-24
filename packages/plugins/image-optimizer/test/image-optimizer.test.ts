import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  type PluginAssetTransformContext,
  resolveConfig,
} from "@riebeckite/core";
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

test("reuses transformed variants for unchanged image bytes", async () => {
  const input = await sharp({
    create: { width: 1000, height: 500, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const values = new Map<string, unknown>();
  const events: string[] = [];
  const context = {
    assets: [{ path: "images/photo.png", size: input.byteLength }],
    readAsset: async () => input,
    cache: {
      get: async <T>(key: string) => values.get(key) as T | undefined,
      set: async (key: string, value: unknown) => void values.set(key, value),
      delete: async () => {},
      clear: async () => {},
    },
    logger: {
      warn() {},
      debug() {},
      info() {},
      error() {},
      child() {
        return this;
      },
    },
    tracer: {
      async span<T>(
        _name: string,
        _attributes: object,
        fn: () => T | Promise<T>,
      ) {
        return await fn();
      },
      event(name: string) {
        events.push(name);
      },
    },
  } as PluginAssetTransformContext;
  const transform = imageOptimizer({ widths: [640] }).transformAssets;
  assert.ok(transform);

  const first = await transform(context);
  const second = await transform(context);

  assert.deepEqual(second, first);
  assert.deepEqual(events, [
    "image-transform.run",
    "image-transform.cache-hit",
  ]);
});

test("keeps output inventory and bytes stable across incremental rebuilds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-image-optimizer-"),
  );
  let input = await sharp({
    create: { width: 1000, height: 500, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  let includeImage = true;
  const content: ContentSource = {
    async scan() {
      return [
        { path: "post.md" },
        ...(includeImage
          ? [{ path: "images/photo.png", metadata: { size: input.byteLength } }]
          : []),
      ];
    },
    async read(entry) {
      return entry.path === "post.md"
        ? `---\npublish: true\n---\n${includeImage ? "![image](images/photo.png)" : "No image."}`
        : input;
    },
  };
  const build = async (quality: number) => {
    const config = {
      ...resolveConfig({
        site: { title: "Test" },
        plugins: [
          imageOptimizer({ formats: ["webp"], widths: [640], quality }),
        ],
      }),
      buildDirectory: directory,
    };
    const manager = new ContentManager(content, [], {
      config,
      plugins: config.plugins,
    });
    try {
      const manifest = await manager.build({ incremental: true });
      return manifest.generatedOutputs.map(({ path, content }) => [
        path,
        Buffer.from(content).toString("base64"),
      ]);
    } finally {
      await manager.dispose();
    }
  };

  try {
    const cold = await build(80);
    const unchanged = await build(80);
    assert.deepEqual(unchanged, cold);

    input = await sharp({
      create: { width: 1000, height: 500, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const edited = await build(80);
    assert.notDeepEqual(edited, cold);

    await build(40);
    const versions = await fs.readdir(
      path.join(directory, "cache", "image-optimizer"),
    );
    assert.equal(versions.length, 2);

    includeImage = false;
    assert.deepEqual(await build(40), []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
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
