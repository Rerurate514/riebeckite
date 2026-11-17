import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifestEntry, Diagnostic } from "@riebeckite/core";
import {
  buildDiscordHeadTags,
  DEFAULT_THEME_COLOR,
  discordEmbed,
  resolveDiscordEmbedOptions,
} from "../index.js";

function entry(
  overrides: Partial<ContentManifestEntry> = {},
  frontmatter: Record<string, unknown> = {},
): ContentManifestEntry {
  return {
    slug: "note",
    title: "Note",
    frontmatter,
    ...overrides,
  } as ContentManifestEntry;
}

function attrs(tags: ReturnType<typeof buildDiscordHeadTags>) {
  return Object.fromEntries(
    tags.map((tag) => [
      String(tag.attrs.name ?? tag.attrs.property),
      tag.attrs.content,
    ]),
  );
}

test("resolves defaults", () => {
  assert.deepEqual(resolveDiscordEmbedOptions(), {
    themeColor: DEFAULT_THEME_COLOR,
    imageAlt: true,
    imageDimensions: true,
  });
  assert.deepEqual(
    resolveDiscordEmbedOptions({
      themeColor: "#000",
      imageAlt: false,
      imageDimensions: false,
    }),
    { themeColor: "#000", imageAlt: false, imageDimensions: false },
  );
});

test("validates the color and boolean options", () => {
  const plugin = discordEmbed();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  for (const themeColor of ["#abc", "#abcd", "#aabbcc", "#aabbccdd"]) {
    assert.deepEqual(plugin.validateOptions?.({ themeColor }), []);
  }
  for (const themeColor of ["abc", "#12345", "#gggggg", 42]) {
    assert.deepEqual(
      plugin.validateOptions?.({ themeColor } as never),
      [
        {
          path: "themeColor",
          message: 'Expected a hex color such as "#5865F2".',
        },
      ],
      String(themeColor),
    );
  }
  assert.deepEqual(
    plugin.validateOptions?.({ imageAlt: 1, imageDimensions: "no" } as never),
    [
      { path: "imageAlt", message: "Expected a boolean." },
      { path: "imageDimensions", message: "Expected a boolean." },
    ],
  );
});

test("emits the theme color and lets frontmatter override it", () => {
  const diagnostics: Diagnostic[] = [];
  const resolved = resolveDiscordEmbedOptions();

  assert.equal(
    attrs(buildDiscordHeadTags(entry(), resolved, diagnostics))["theme-color"],
    DEFAULT_THEME_COLOR,
  );
  assert.equal(
    attrs(
      buildDiscordHeadTags(
        entry({}, { discord_color: "#123456", themeColor: "#654321" }),
        resolved,
        diagnostics,
      ),
    )["theme-color"],
    "#654321",
  );
  assert.deepEqual(diagnostics, []);
});

test("reports an invalid frontmatter color and falls back to the option", () => {
  const diagnostics: Diagnostic[] = [];
  const resolved = resolveDiscordEmbedOptions({ themeColor: "#ffffff" });

  const tags = buildDiscordHeadTags(
    entry({ slug: "post" }, { theme_color: "blurple" }),
    resolved,
    diagnostics,
  );

  assert.equal(attrs(tags)["theme-color"], "#ffffff");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "discord-embed-invalid-color");
  assert.equal(diagnostics[0].severity, "warning");
  assert.match(diagnostics[0].message, /"blurple"/);
  assert.match(String(diagnostics[0].suggestion), /#ffffff/);
});

test("adds image alt text and dimensions when an image exists", () => {
  const diagnostics: Diagnostic[] = [];
  const resolved = resolveDiscordEmbedOptions();

  const tags = buildDiscordHeadTags(
    entry(
      {},
      {
        ogImage: "/cover.png",
        ogImageWidth: "1200",
        imageHeight: 630,
      },
    ),
    resolved,
    diagnostics,
  );

  assert.deepEqual(
    tags.map((tag) => tag.attrs),
    [
      { name: "theme-color", content: DEFAULT_THEME_COLOR },
      { property: "og:image:alt", content: "Note" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
  );
});

test("falls back to the slug for alt text and skips image tags without an image", () => {
  const diagnostics: Diagnostic[] = [];
  const resolved = resolveDiscordEmbedOptions();

  assert.deepEqual(
    buildDiscordHeadTags(entry({ title: " " }, {}), resolved, diagnostics).map(
      (tag) => tag.attrs,
    ),
    [{ name: "theme-color", content: DEFAULT_THEME_COLOR }],
  );

  const tags = buildDiscordHeadTags(
    entry({ title: " " }, { image: "/cover.png" }),
    resolved,
    diagnostics,
  );
  assert.deepEqual(tags[1].attrs, {
    property: "og:image:alt",
    content: "note",
  });
});

test("honours the image option flags", () => {
  const diagnostics: Diagnostic[] = [];
  const noAlt = buildDiscordHeadTags(
    entry({}, { ogImage: "/cover.png", ogImageWidth: 800 }),
    resolveDiscordEmbedOptions({ imageAlt: false }),
    diagnostics,
  );
  const noDimensions = buildDiscordHeadTags(
    entry({}, { ogImage: "/cover.png", ogImageWidth: 800 }),
    resolveDiscordEmbedOptions({ imageDimensions: false }),
    diagnostics,
  );

  assert.deepEqual(
    noAlt.map((tag) => tag.attrs),
    [
      { name: "theme-color", content: DEFAULT_THEME_COLOR },
      { property: "og:image:width", content: "800" },
    ],
  );
  assert.deepEqual(
    noDimensions.map((tag) => tag.attrs),
    [
      { name: "theme-color", content: DEFAULT_THEME_COLOR },
      { property: "og:image:alt", content: "Note" },
    ],
  );
});

test("fills head tags for every manifest entry", () => {
  const plugin = discordEmbed({ themeColor: "#010203" });
  const entries = [
    entry({ slug: "a" }),
    entry({ slug: "b" }, { discord_color: "#040506" }),
  ];
  const diagnostics: Diagnostic[] = [];

  plugin.onManifestCreated?.({
    manifest: { entries } as never,
    diagnostics,
  } as never);

  assert.equal(
    (entries[0].headTags?.[0].attrs as { content: string }).content,
    "#010203",
  );
  assert.equal(
    (entries[1].headTags?.[0].attrs as { content: string }).content,
    "#040506",
  );
});
