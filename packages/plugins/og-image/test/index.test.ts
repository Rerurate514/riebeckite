import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { ogImage, validateOgImageOptions } from "../index.js";

test("keeps explicit image frontmatter and plans only owned paths", async () => {
  const plugin = ogImage();
  const generated = entry({});
  const explicit = entry({ ogImage: "/images/explicit.png" });
  const image = entry({ image: "/images/cover.png" });
  const manifest = { publicEntries: [generated, explicit, image] };

  plugin.onManifestCreated?.({ manifest } as never);
  const outputs = await plugin.planDeferredOutputs?.({
    manifest: { routableEntries: [generated, explicit, image] },
    site: { title: "Riebeckite" },
    derived: {},
  } as never);

  assert.match(
    String(generated.frontmatter.ogImage),
    /^\/_og\/[a-f0-9]{16}\.png$/,
  );
  assert.equal(explicit.frontmatter.ogImage, "/images/explicit.png");
  assert.equal(image.frontmatter.image, "/images/cover.png");
  assert.equal(outputs?.length, 1);
  assert.equal(outputs?.[0]?.path.startsWith("_og/"), true);
  assert.equal(typeof outputs?.[0]?.fingerprint, "string");
});

test("requires a fingerprint for a custom layout", () => {
  assert.deepEqual(validateOgImageOptions({ layout: () => "" }), [
    { path: "layoutFingerprint", message: "Required when layout is provided." },
  ]);
});

test("exposes its configuration in Development Inspector", async () => {
  const plugin = ogImage({
    appearance: { accent: "#f97316" },
    layout: "test/tsx-layout.tsx",
  });
  const tab = plugin.inspector?.tabs[0];

  assert.equal(tab?.id, "og-image");
  const data = await tab?.collect?.({} as never);
  assert.deepEqual(data, {
    kind: "key-value",
    items: [
      { key: { en: "Preset", ja: "プリセット" }, value: "card" },
      {
        key: { en: "Layout", ja: "レイアウト" },
        value: "test/tsx-layout.tsx",
      },
      {
        key: { en: "Output prefix", ja: "出力プレフィックス" },
        value: "/_og/",
      },
      {
        key: { en: "Palette", ja: "配色" },
        value: {
          background: "#18212f",
          foreground: "#f8fafc",
          accent: "#f97316",
        },
      },
    ],
  });
  await rm(resolve("test", ".riebeckite"), { force: true, recursive: true });
});

test("loads a TSX layout and renders it through the production renderer", async () => {
  const plugin = ogImage({ layout: "test/tsx-layout.tsx" });
  const generated = entry({});
  plugin.onManifestCreated?.({
    manifest: { publicEntries: [generated] },
  } as never);
  const outputs = await plugin.planDeferredOutputs?.({
    manifest: { routableEntries: [generated] },
    site: { title: "Riebeckite" },
    derived: {},
  } as never);
  try {
    const image = await outputs?.[0]?.generate();
    assert.deepEqual(
      [...(image?.slice(0, 8) ?? [])],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  } finally {
    await rm(resolve("test", ".riebeckite"), { force: true, recursive: true });
  }
});

test("resolves the palette from the configured theme", async () => {
  const lightTheme = {
    name: "rerurate",
    colorMode: "light" as const,
    palette: {
      light: {
        background: "#f6efe2",
        foreground: "#171717",
        accent: "#f66620",
      },
    },
  };
  const run = async (theme: {
    name: string;
    colorMode: "light" | "dark";
    palette: Record<string, Partial<{ background: string }>>;
  }) => {
    const plugin = ogImage();
    const generated = entry({});
    plugin.onManifestCreated?.({
      manifest: { publicEntries: [generated] },
      config: { theme },
    } as never);
    await plugin.planDeferredOutputs?.({
      manifest: { routableEntries: [generated] },
      site: { title: "Riebeckite" },
      theme,
      derived: {},
    } as never);
    return generated.frontmatter.ogImage;
  };

  const light = await run(lightTheme);
  const dark = await run({
    ...lightTheme,
    colorMode: "dark",
    palette: { dark: { background: "#1c1a17" } },
  });

  assert.match(String(light), /^\/_og\/[a-f0-9]{16}\.png$/);
  assert.notEqual(light, dark);
});

function entry(frontmatter: Record<string, unknown>) {
  return {
    slug: "note",
    title: "A note",
    permalink: "/note",
    frontmatter,
    publicLocation: { language: "en" },
    tags: [],
  };
}
