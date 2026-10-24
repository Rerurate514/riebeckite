import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  definePlugin,
  type PluginAssetTransformContext,
  resolveConfig,
} from "@riebeckite/core";
import { imageOptimizer } from "@riebeckite/plugin-image-optimizer";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import sharp from "sharp";
import { resolveSvgOptimizerOptions, svgOptimizer } from "../index.ts";

const ACCESSIBLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-labelledby="t d">
  <title id="t">Diagram title</title>
  <desc id="d">A diagram with a gradient.</desc>
  <metadata>editor</metadata>
  <!-- comment -->
  <defs>
    <linearGradient id="paint"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="mask"><rect width="100" height="100" fill="white"/></mask>
    <clipPath id="clip"><circle cx="50" cy="50" r="40"/></clipPath>
  </defs>
  <g mask="url(#mask)" clip-path="url(#clip)"><path fill="url(#paint)" d="M 0 0 L 10 10"/></g>
</svg>`;
const SVG_BYTES = Buffer.from(ACCESSIBLE_SVG);
const testConfig = resolveConfig({
  site: { title: "Test" },
  cache: { enabled: false },
});

test("normalizes SVG optimizer options", () => {
  assert.deepEqual(resolveSvgOptimizerOptions(), {
    multipass: true,
    preserveViewBox: true,
    preserveAccessibility: true,
    keepOriginal: false,
  });
  assert.deepEqual(
    resolveSvgOptimizerOptions({
      multipass: false,
      preserveViewBox: false,
      preserveAccessibility: false,
      keepOriginal: true,
    }),
    {
      multipass: false,
      preserveViewBox: false,
      preserveAccessibility: false,
      keepOriginal: true,
    },
  );
});

test("optimizes SVG while preserving structure, references, and accessibility", async () => {
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![diagram](images/diagram.svg)",
      "images/diagram.svg": SVG_BYTES,
    }),
    [],
    { config: testConfig, plugins: [svgOptimizer()] },
  ).getManifest();

  const output = manifest.generatedOutputs.find(
    (candidate) => candidate.path === "images/diagram.svg",
  );
  assert.ok(output);
  const optimized = Buffer.from(output.content as Uint8Array).toString("utf8");

  assert.ok(optimized.length < ACCESSIBLE_SVG.length);
  assert.match(optimized, /viewBox="0 0 100 100"/);
  assert.match(optimized, /<title id="t">Diagram title<\/title>/);
  assert.match(optimized, /<desc id="d">A diagram with a gradient\.<\/desc>/);
  assert.match(optimized, /aria-labelledby="t d"/);
  assert.match(optimized, /id="paint"/);
  assert.match(optimized, /id="mask"/);
  assert.match(optimized, /id="clip"/);
  assert.match(optimized, /url\(#paint\)/);
  assert.match(optimized, /url\(#mask\)/);
  assert.match(optimized, /url\(#clip\)/);
  assert.doesNotMatch(optimized, /comment|metadata|editor/);
  assert.match(
    manifest.publicEntries[0]?.html ?? "",
    /src="\/images\/diagram\.svg"/,
  );
});

test("drops accessibility metadata only when disabled", async () => {
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![diagram](images/diagram.svg)",
      "images/diagram.svg": SVG_BYTES,
    }),
    [],
    {
      config: testConfig,
      plugins: [svgOptimizer({ preserveAccessibility: false })],
    },
  ).getManifest();

  const output = manifest.generatedOutputs.find(
    (candidate) => candidate.path === "images/diagram.svg",
  );
  assert.ok(output);
  const optimized = Buffer.from(output.content as Uint8Array).toString("utf8");
  assert.doesNotMatch(optimized, /<title|<desc/);
});

test("reuses an optimized SVG for unchanged bytes", async () => {
  const values = new Map<string, unknown>();
  const events: string[] = [];
  const context = transformContext(
    { "images/diagram.svg": SVG_BYTES },
    values,
    events,
  );
  const transform = svgOptimizer().transformAssets;
  assert.ok(transform);

  const first = await transform(context);
  const second = await transform(context);

  assert.equal(first.length, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(events, ["svg-transform.run", "svg-transform.cache-hit"]);
});

test("skips invalid and unsafe SVG without treating optimization as sanitization", async () => {
  const values = new Map<string, unknown>();
  const warnings: string[] = [];
  const context = transformContext(
    {
      "images/invalid-utf8.svg": new Uint8Array([0xff, 0xfe]),
      "images/malformed.svg": "<svg><path></svg>",
      "images/script.svg": "<svg><script>alert(1)</script></svg>",
      "images/foreign.svg": "<svg><foreignObject /></svg>",
      "images/external.svg":
        '<svg><image href="https://example.com/x.png"/></svg>',
      "images/event.svg": '<svg onload="alert(1)"></svg>',
      "images/css.svg":
        '<svg><rect style="fill:url(https://example.com/x)"/></svg>',
      "images/entity.svg":
        '<!DOCTYPE svg SYSTEM "https://example.com/x.dtd"><svg/>',
      "images/nested.svg":
        '<svg><image href="data:image/svg+xml;base64,AA=="/></svg>',
      "images/unquoted.svg":
        "<svg><image href=https://example.com/x.png /></svg>",
      "images/encoded.svg":
        '<svg><image href="java&#115;cript:alert(1)"/></svg>',
    },
    values,
    [],
    warnings,
  );
  const transform = svgOptimizer().transformAssets;
  assert.ok(transform);

  assert.deepEqual(await transform(context), []);
  assert.equal(warnings.length, 11);
});

test("keeps the original when an SVG cannot be optimized", async () => {
  const invalid = new Uint8Array([0xff, 0xfe]);
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![diagram](images/diagram.svg)",
      "images/diagram.svg": invalid,
    }),
    [],
    { config: testConfig, plugins: [svgOptimizer()] },
  ).getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => [output.path, output.content]),
    [["images/diagram.svg", invalid]],
  );
});

test("optimizes Markdown images and Obsidian embeds alongside image variants", async () => {
  const photo = await sharp({
    create: { width: 1000, height: 500, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const manifest = await new ContentManager(
    source({
      "post.md": [
        "---",
        "publish: true",
        "---",
        "![logo](images/logo.svg)",
        "![[diagram.svg]]",
        "![photo](images/photo.png)",
      ].join("\n"),
      "images/logo.svg": SVG_BYTES,
      "attachments/diagram.svg": SVG_BYTES,
      "images/photo.png": photo,
    }),
    [],
    {
      config: testConfig,
      plugins: [
        obsidianMarkdown(),
        imageOptimizer({ formats: ["webp"], widths: [640] }),
        svgOptimizer(),
      ],
    },
  ).getManifest();

  const outputs = manifest.generatedOutputs;
  const svgOutputs = outputs.filter((output) => output.path.endsWith(".svg"));
  assert.deepEqual(svgOutputs.map((output) => output.path).sort(), [
    "attachments/diagram.svg",
    "images/logo.svg",
  ]);
  for (const output of svgOutputs) {
    assert.ok(
      (output.content as Uint8Array).byteLength <
        Buffer.byteLength(ACCESSIBLE_SVG),
    );
  }
  assert.ok(outputs.some((output) => output.path === "images/photo-640.webp"));
  const entry = manifest.publicEntries[0];
  assert.match(entry?.html ?? "", /src="\/images\/logo\.svg"/);
  assert.match(entry?.html ?? "", /src="\/attachments\/diagram\.svg"/);
});

test("keeps the original SVG when configured", async () => {
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![diagram](images/diagram.svg)",
      "images/diagram.svg": SVG_BYTES,
    }),
    [],
    { config: testConfig, plugins: [svgOptimizer({ keepOriginal: true })] },
  ).getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => [
      output.path,
      Buffer.from(output.content as Uint8Array).toString("utf8"),
    ]),
    [["images/diagram.svg", ACCESSIBLE_SVG]],
  );
});

test("optimizes only assets referenced from public and unlisted entries", async () => {
  const manager = new ContentManager(
    source({
      "public.md": "---\nvisibility: public\n---\n![public](public.svg)",
      "unlisted.md":
        "---\nvisibility: unlisted\n---\n![unlisted](unlisted.svg)",
      "draft.md": "---\nvisibility: draft\n---\n![draft](draft.svg)",
      "scheduled.md":
        "---\npublishAt: 2999-01-01T00:00:00.000Z\n---\n![scheduled](scheduled.svg)",
      "public.svg": SVG_BYTES,
      "unlisted.svg": SVG_BYTES,
      "draft.svg": SVG_BYTES,
      "scheduled.svg": SVG_BYTES,
    }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        cache: { enabled: false },
        content: { filters: { publishStrategy: "explicit" } },
      }),
      publishingBuildTime: "2024-01-01T00:00:00.000Z",
      plugins: [svgOptimizer()],
    },
  );

  const manifest = await manager.getManifest();
  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path).sort(),
    ["public.svg", "unlisted.svg"],
  );
});

test("keeps optimized bytes stable across incremental rebuilds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-svg-optimizer-"),
  );
  let svg = SVG_BYTES;
  let includeImage = true;
  const content: ContentSource = {
    async scan() {
      return [
        { path: "post.md" },
        ...(includeImage
          ? [{ path: "images/diagram.svg", metadata: { size: svg.byteLength } }]
          : []),
      ];
    },
    async read(entry) {
      return entry.path === "post.md"
        ? `---\npublish: true\n---\n${includeImage ? "![diagram](images/diagram.svg)" : "No image."}`
        : svg;
    },
  };
  const build = async (options: Parameters<typeof svgOptimizer>[0] = {}) => {
    const config = {
      ...resolveConfig({
        site: { title: "Test" },
        plugins: [svgOptimizer(options)],
      }),
      buildDirectory: directory,
    };
    const manager = new ContentManager(content, [], {
      config,
      plugins: config.plugins,
    });
    try {
      const manifest = await manager.build({ incremental: true });
      return manifest.generatedOutputs.map(({ path: outputPath, content }) => [
        outputPath,
        Buffer.from(content).toString("base64"),
      ]);
    } finally {
      await manager.dispose();
    }
  };

  try {
    const cold = await build();
    const unchanged = await build();
    assert.deepEqual(unchanged, cold);

    svg = Buffer.from(ACCESSIBLE_SVG.replace("#fff", "#f00"));
    const edited = await build();
    assert.notDeepEqual(edited, cold);

    await build({ preserveAccessibility: false });
    const versions = await fs.readdir(
      path.join(directory, "cache", "svg-optimizer"),
    );
    assert.equal(versions.length, 2);

    includeImage = false;
    assert.deepEqual(await build({ preserveAccessibility: false }), []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects a generated output that collides with an optimized SVG", async () => {
  const manager = new ContentManager(
    source({
      "post.md": "---\npublish: true\n---\n![diagram](images/diagram.svg)",
      "images/diagram.svg": SVG_BYTES,
    }),
    [],
    {
      config: testConfig,
      plugins: [
        svgOptimizer(),
        definePlugin({
          name: "conflicting-output",
          buildEnd: ({ output }) => {
            output.emitAsset({
              path: "images/diagram.svg",
              content: "other",
            });
          },
        }),
      ],
    },
  );

  await assert.rejects(manager.getManifest(), (error) => {
    assert.match(
      String((error as Error & { cause?: unknown }).cause),
      /images\/diagram\.svg/,
    );
    return true;
  });
});

function transformContext(
  files: Record<string, string | Uint8Array>,
  values: Map<string, unknown>,
  events: string[],
  warnings: string[] = [],
): PluginAssetTransformContext {
  return {
    assets: Object.entries(files).map(([assetPath, content]) => ({
      path: assetPath,
      size:
        typeof content === "string"
          ? Buffer.byteLength(content)
          : content.byteLength,
    })),
    readAsset: async (assetPath) => {
      const content = files[assetPath];
      if (content === undefined) return null;
      return typeof content === "string" ? Buffer.from(content) : content;
    },
    cache: {
      get: async <T>(key: string) => values.get(key) as T | undefined,
      set: async (key: string, value: unknown) => void values.set(key, value),
      delete: async () => {},
      clear: async () => {},
    },
    logger: {
      warn(message: string) {
        warnings.push(message);
      },
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
}

function source(files: Record<string, string | Uint8Array>): ContentSource {
  return {
    async scan() {
      return Object.entries(files).map(([filePath, content]) => ({
        path: filePath,
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
