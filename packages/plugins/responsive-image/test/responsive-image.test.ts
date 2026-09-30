import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import {
  applyResponsiveImages,
  buildResponsiveSrcset,
  collectKnownAssetPaths,
  rehypeResponsiveImage,
  resolveResponsiveImageOptions,
  responsiveImagePlugin,
} from "../index.ts";
import { validateResponsiveImageOptions } from "../src/options.ts";

const KNOWN_PATHS = new Set([
  "images/hero.png",
  "images/hero-640.webp",
  "images/hero-1280.webp",
  "images/hero-1920.webp",
  "images/hero-640.avif",
  "images/hero-640.png",
  "images/hero-999.webp",
]);

test("builds a picture plan from known sibling variants", () => {
  const plan = buildResponsiveSrcset(KNOWN_PATHS, "/images/hero.png");

  assert.deepEqual(plan, {
    hasVariants: true,
    assetPath: "images/hero.png",
    sources: [
      {
        type: "image/webp",
        srcset:
          "/images/hero-640.webp 640w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w",
      },
      { type: "image/avif", srcset: "/images/hero-640.avif 640w" },
    ],
    imgSrcset: "/images/hero-640.png 640w",
  });
});

test("only selects configured widths and formats", () => {
  const plan = buildResponsiveSrcset(KNOWN_PATHS, "/images/hero.png", {
    widths: [1280],
    formats: ["webp"],
  });

  assert.deepEqual(plan.sources, [
    { type: "image/webp", srcset: "/images/hero-1280.webp 1280w" },
  ]);
  assert.equal(plan.imgSrcset, "");
});

test("resolves attachment sources through attachmentUrl", () => {
  const known = new Set(["media/clip.png", "media/clip-640.webp"]);
  const plan = buildResponsiveSrcset(
    known,
    "/assets/attachments/media/clip.png",
  );

  assert.equal(plan.assetPath, "media/clip.png");
  assert.deepEqual(plan.sources, [
    {
      type: "image/webp",
      srcset: "/assets/attachments/media/clip-640.webp 640w",
    },
  ]);
});

test("returns an empty plan for unknown, external, or empty sources", () => {
  const empty = {
    hasVariants: false,
    assetPath: null,
    sources: [],
    imgSrcset: "",
  };

  assert.deepEqual(
    buildResponsiveSrcset(KNOWN_PATHS, "/images/missing.png"),
    empty,
  );
  assert.deepEqual(buildResponsiveSrcset(KNOWN_PATHS, ""), empty);
  assert.equal(
    buildResponsiveSrcset(KNOWN_PATHS, "https://example.com/hero.png")
      .hasVariants,
    false,
  );
  assert.equal(
    buildResponsiveSrcset(KNOWN_PATHS, "/images/hero.png?v=2#top").assetPath,
    "images/hero.png",
  );
});

test("normalizes and validates options", () => {
  assert.deepEqual(resolveResponsiveImageOptions(), {
    lazy: true,
    decoding: true,
    sizes: "100vw",
    widths: [640, 1280, 1920],
    formats: ["webp", "avif"],
    className: "rb-responsive-image",
    generate: false,
    outputDir: null,
  });

  const resolved = resolveResponsiveImageOptions({
    lazy: false,
    sizes: " 50vw ",
    widths: [1280, 640, 640, -1, 0],
    formats: [" .WEBP ", "avif", "webp", ""],
    className: "  hero  ",
    generate: true,
    outputDir: "dist",
  });
  assert.equal(resolved.sizes, "50vw");
  assert.deepEqual(resolved.widths, [640, 1280]);
  assert.deepEqual(resolved.formats, ["webp", "avif"]);
  assert.equal(resolved.className, "hero");
  assert.equal(resolved.generate, true);
  assert.equal(resolved.outputDir, "dist");

  assert.deepEqual(validateResponsiveImageOptions({ lazy: "yes" } as never), [
    { path: "lazy", message: "Expected a boolean." },
  ]);
  assert.deepEqual(validateResponsiveImageOptions({ widths: [0, -1] }), [
    { path: "widths", message: "Expected an array of positive integers." },
  ]);
  assert.deepEqual(validateResponsiveImageOptions(undefined), []);
  assert.deepEqual(validateResponsiveImageOptions({ sizes: "50vw" }), []);
});

test("rewrites marked images and leaves everything else untouched", () => {
  const html = [
    '<p>Before</p><img src="/images/hero.png" data-responsive-image alt="Hero &amp; Co" />',
    '<img src="/images/hero.png" alt="" />',
    '<img src="/images/missing.png" data-responsive-image alt="" />',
    "<p>After</p>",
  ].join("");

  assertGolden(
    applyResponsiveImages(html, KNOWN_PATHS),
    new URL("./__golden__/picture.html", import.meta.url),
  );
});

test("escapes the configured picture class name", () => {
  const html = applyResponsiveImages(
    '<img src="/images/hero.png" data-responsive-image />',
    KNOWN_PATHS,
    { className: 'a&"b' },
  );

  assert.ok(html.startsWith('<picture class="a&amp;&quot;b">'));
});

test("rehype pass normalizes image attributes and marks them", () => {
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "img", properties: { src: "/x.png" } },
    ],
  };

  rehypeResponsiveImage()(tree as never, { message() {} });

  assert.deepEqual((tree.children[0] as { properties: unknown }).properties, {
    src: "/x.png",
    loading: "lazy",
    decoding: "async",
    sizes: "100vw",
    dataResponsiveImage: "",
  });
});

test("rehype pass warns on a missing src and skips marked images", () => {
  const messages: string[] = [];
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "img", properties: {} },
      {
        type: "element",
        tagName: "img",
        properties: { src: "/x.png", dataResponsiveImage: "1" },
      },
    ],
  };

  rehypeResponsiveImage()(tree as never, {
    message: (reason: string) => messages.push(reason),
  });

  assert.equal(messages.length, 1);
  assert.deepEqual((tree.children[1] as { properties: unknown }).properties, {
    src: "/x.png",
    dataResponsiveImage: "1",
  });
});

test("collects known asset paths from a real manifest", async () => {
  const manifest = await new ContentManager(
    source({
      "post.md": "---\npublish: true\ntitle: Post\n---\n\n![[images/hero.png]]",
      "images/hero.png": "",
      "images/hero-640.webp": "",
    }),
    [],
    { config: explicitConfig },
  ).getManifest();

  assert.deepEqual([...collectKnownAssetPaths(manifest)], ["images/hero.png"]);
});

test("registers the responsive-image stylesheet", () => {
  const plugin = responsiveImagePlugin();

  assert.equal(plugin.name, "responsive-image");
  assert.equal(plugin.order, 100);
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "responsive-image",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-responsive-image/style.css",
    },
  ]);
});

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const explicitConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});
