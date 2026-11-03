import assert from "node:assert/strict";
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
